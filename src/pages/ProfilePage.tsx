// src/pages/ProfilePage.tsx
import { useState, useEffect, useRef, type TouchEvent as ReactTouchEvent, type CSSProperties } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { Settings, Wallet, MessageCircle, MoreHorizontal, Plus, Eye, X, Globe, UserCheck, Lock, Redo2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProfileByUsername, useIsFollowing, useIsFollowedByUser, useToggleFollow } from "../hooks/useProfile";
import {
  useHasPendingFollowRequest,
  useSendFollowRequest,
  useCancelFollowRequest,
  useIncomingFollowRequestCount,
} from "../hooks/useFollowRequests";
import { useUserPostsWithArchived } from "../hooks/usePosts";
import { useStartConversation } from "../hooks/useMessaging";
import { useIsBlocked, useToggleBlock, useIsMuted, useToggleMute } from "../hooks/usePrivacy";
import { useUserProjects } from "../hooks/useProjects";
import { useRecordProfileVisit, useProfileVisitCount } from "../hooks/useProfileVisits";
import { Avatar } from "../components/Avatar";
import { ImageLightbox } from "../components/ImageLightbox";
import { TierBadge } from "../components/TierBadge";
import { RoleTags } from "../components/RoleTags";
import { PostCard } from "../components/PostCard";
import { ProjectCard } from "../components/ProjectCard";
import { BottomNav } from "../components/BottomNav";

// Website links are saved in full (whatever the user pastes, including
// long query strings), but only the bare domain is ever shown — the
// full URL still opens on click via getWebsiteHref. Handles input with
// or without a protocol ("meckury.ai/..." or "https://meckury.ai/...").
function getWebsiteHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function getWebsiteDomain(url: string): string {
  try {
    return new URL(getWebsiteHref(url)).hostname.replace(/^www\./, "");
  } catch {
    // Malformed input (shouldn't normally happen) — best-effort fallback
    return url.replace(/^https?:\/\//i, "").split("/")[0];
  }
}

// Posts/Projects only now — the owner's tickets/meetings/room
// activity moved to its own page in the Activity hub (see
// EventsActivity.tsx, reachable from the Activity icon in BottomNav)
// rather than living here as a third profile tab.
const TABS = ["posts", "projects"] as const;
type ProfileTab = (typeof TABS)[number];
const SWIPE_THRESHOLD_PX = 50;

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const startConversation = useStartConversation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Separate menu from the visitor-side mute/block one below — the
  // owner's dropdown (Share profile / View as visitor / Follow
  // requests / Wallet / Settings) needs its own open state and its
  // own outside-click ref.
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const ownerMenuRef = useRef<HTMLDivElement>(null);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);

  const [previewingAsVisitor, setPreviewingAsVisitor] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const { data: profile, isLoading } = useProfileByUsername(username!);
  const [searchParams] = useSearchParams();
  // Lets a shared project link (?tab=projects) land directly on the
  // Projects tab instead of Posts. Read once on mount — the tabs are
  // still plain buttons after that, so clicking Posts/Projects
  // doesn't fight the URL.
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    searchParams.get("tab") === "projects" ? "projects" : "posts"
  );
  // Which side new tab content springs in from — same idea as Feed's tab
  // row: 1 (from the right) moving to a later tab, -1 (from the left)
  // moving to an earlier one. Read by the CSS animation via --tab-dir.
  const [tabDirection, setTabDirection] = useState(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const isFollowingQuery = useIsFollowing(profile?.id ?? "");
  const isFollowedByUserQuery = useIsFollowedByUser(profile?.id ?? "");
  const toggleFollow = useToggleFollow(profile?.id ?? "");
  const hasPendingRequestQuery = useHasPendingFollowRequest(profile?.id ?? "");
  const sendFollowRequest = useSendFollowRequest(profile?.id ?? "");
  const cancelFollowRequest = useCancelFollowRequest(profile?.id ?? "");
  const incomingRequestCount = useIncomingFollowRequestCount();
  const isBlockedQuery = useIsBlocked(profile?.id ?? "");
  const toggleBlock = useToggleBlock(profile?.id ?? "");
  const isMutedQuery = useIsMuted(profile?.id ?? "");
  const toggleMute = useToggleMute(profile?.id ?? "");

  const isOwnProfile = user?.id === profile?.id;
  const showOwnerView = isOwnProfile && !previewingAsVisitor;

  const isFollowing = !!isFollowingQuery.data;
  const isFollowedByUser = !!isFollowedByUserQuery.data;
  const hasPendingRequest = !!hasPendingRequestQuery.data;
  const isBlocked = !!isBlockedQuery.data;
  const isMuted = !!isMutedQuery.data;
  const firstName = profile?.display_name?.trim().split(/\s+/)[0] ?? "";

  // A private account's posts and projects must never reach a visitor
  // who isn't an approved follower — not "hidden behind a tab", not
  // "shown then blocked", genuinely never fetched. While the follow
  // status is still loading, this defaults to locked (rather than
  // briefly showing content and yanking it back a moment later), which
  // is the safer direction to be wrong in for a privacy gate.
  const isPrivateLocked = !!profile?.is_private && !showOwnerView && !isFollowing;

  // Passing "" makes each hook's own `enabled: !!userId` guard skip the
  // request entirely — a locked-out visitor's client never asks the
  // server for this profile's posts/projects in the first place.
  const { data: projects } = useUserProjects(isPrivateLocked ? "" : profile?.id ?? "", showOwnerView);
  const { data: posts } = useUserPostsWithArchived(isPrivateLocked ? "" : profile?.id ?? "", false);

  // Archived projects have their own home on the merged Archive page
  // now (see Archive.tsx) — this tab only ever shows active/draft/
  // cancelled ones.
  const visibleProjects = projects?.filter((p) => p.status !== "archived");

  // Profile visits: recording a visit is safe to fire on every mount
  // (it no-ops for self-visits inside the hook); the 30-day count is
  // only ever fetched — and only ever shown — in the true owner view,
  // never while previewing as a visitor.
  useRecordProfileVisit(profile?.id);
  const { data: visitCount } = useProfileVisitCount(profile?.id, showOwnerView);

  // Outside-click / outside-tap closes whichever "…" menu is open —
  // the visitor-side mute/block one, or the owner-side options one.
  // Each only listened for clicks on its own toggle button before, so
  // tapping anywhere else on the page while open did nothing.
  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!ownerMenuOpen) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (ownerMenuRef.current && !ownerMenuRef.current.contains(e.target as Node)) {
        setOwnerMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [ownerMenuOpen]);

  function handleFollowClick() {
    if (isFollowing) {
      // Unfollowing gets a confirm whenever there's something worth
      // knowing first: a mutual follow (easy to drop by accident) or
      // a private account (re-following means asking again, not an
      // instant follow) — either reason is enough to pause, and the
      // modal below shows whichever applies.
      if (isFollowedByUser || profile?.is_private) {
        setShowUnfollowConfirm(true);
        return;
      }
      toggleFollow.mutate(true);
      return;
    }

    if (hasPendingRequest) {
      cancelFollowRequest.mutate();
      return;
    }

    if (profile?.is_private) {
      sendFollowRequest.mutate();
      return;
    }

    toggleFollow.mutate(false);
  }

  function confirmUnfollow() {
    toggleFollow.mutate(true);
    setShowUnfollowConfirm(false);
  }

  async function handleMessage() {
    if (!profile) return;
    const conversationId = await startConversation.mutateAsync(profile.id);
    navigate(`/messages/${conversationId}`);
  }

  // Same pattern as ProjectCard's share button: native share sheet
  // when available (it already offers "copy link" alongside apps on
  // most platforms), plain clipboard copy otherwise. The URL is the
  // profile's own canonical route — opened by anyone other than the
  // owner, it renders exactly as the ordinary visitor view already
  // does, so no separate "visitor mode" flag is needed. Split from
  // the menu-closing so both the owner's dropdown and the visitor's
  // "…" menu can call it and each close their own open state first.
  async function shareProfile() {
    if (!profile) return;
    const url = `${window.location.origin}/profile/${profile.username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: profile.display_name, url });
      } catch {
        // User cancelled the native share sheet — nothing to do.
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  function handleShareProfile() {
    setOwnerMenuOpen(false);
    void shareProfile();
  }

  // Same swipe pattern as Feed's tab row — bound only to the content
  // area below the tab bar (see the wrapping div further down), so
  // swiping over the header/bio never accidentally flips tabs.
  const activeIndex = TABS.indexOf(activeTab);

  function goToIndex(index: number) {
    const clamped = Math.max(0, Math.min(TABS.length - 1, index));
    if (clamped === activeIndex) return;
    setTabDirection(clamped > activeIndex ? 1 : -1);
    setActiveTab(TABS[clamped]);
  }

  function handleTabClick(index: number, tab: ProfileTab) {
    if (index === activeIndex) return;
    setTabDirection(index > activeIndex ? 1 : -1);
    setActiveTab(tab);
  }

  function handleTouchStart(e: ReactTouchEvent) {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  }

  function handleTouchEnd(e: ReactTouchEvent) {
    if (touchStartX === null || touchStartY === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    setTouchStartX(null);
    setTouchStartY(null);

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    if (deltaX < 0) {
      goToIndex(activeIndex + 1);
    } else {
      goToIndex(activeIndex - 1);
    }
  }

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <div className="max-w-xl mx-auto px-4 pt-8">

        {/* Preview-mode banner */}
        {isOwnProfile && previewingAsVisitor && (
          <div className="flex items-center justify-between bg-accent-soft text-accent text-sm rounded-xl px-4 py-2.5 mb-4">
            <span className="flex items-center gap-1.5">
              <Eye size={14} />
              Viewing your profile as a visitor sees it
            </span>
            <button
              onClick={() => setPreviewingAsVisitor(false)}
              className="flex items-center gap-1 font-medium"
            >
              <X size={14} />
              Exit
            </button>
          </div>
        )}

        {/* Action toolbar */}
        {showOwnerView ? (
          <div className="flex items-center justify-end gap-1">
            <Link to="/create" aria-label="Create" className="p-2 text-ink-muted">
              <Plus size={22} />
            </Link>

            <div ref={ownerMenuRef} className="relative">
              <button
                onClick={() => setOwnerMenuOpen((o) => !o)}
                className="relative p-2 text-ink-muted"
                aria-label="Profile options"
              >
                <MoreHorizontal size={20} />
                {/* Same badge shown again on the "Follow requests" row
                    below — this one flags that something inside the
                    menu needs attention before it's even opened. */}
                {incomingRequestCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-danger text-canvas text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
                    {incomingRequestCount > 9 ? "9+" : incomingRequestCount}
                  </span>
                )}
              </button>

              {ownerMenuOpen && (
                <div className="absolute top-full right-0 mt-1 bg-canvas border border-border rounded-xl shadow-lg py-1 w-56 z-10">
                  <button
                    onClick={handleShareProfile}
                    className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
                  >
                    <Redo2 size={16} />
                    Share profile
                  </button>
                  <button
                    onClick={() => {
                      setPreviewingAsVisitor(true);
                      setOwnerMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
                  >
                    <Eye size={16} />
                    View as visitor
                  </button>
                  {profile.is_private && (
                    <Link
                      to="/requests"
                      onClick={() => setOwnerMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface"
                    >
                      <UserCheck size={16} />
                      Follow requests
                      {incomingRequestCount > 0 && (
                        <span className="ml-auto bg-danger text-canvas text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                          {incomingRequestCount > 9 ? "9+" : incomingRequestCount}
                        </span>
                      )}
                    </Link>
                  )}
                  <Link
                    to="/wallet"
                    onClick={() => setOwnerMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface"
                  >
                    <Wallet size={16} />
                    Wallet
                  </Link>
                  <Link
                    to="/settings/profile"
                    onClick={() => setOwnerMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface"
                  >
                    <Settings size={16} />
                    Settings
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : isOwnProfile ? (
          null
        ) : (
          <div className="flex items-center justify-end gap-2 relative">
            <button
              onClick={handleMessage}
              disabled={startConversation.isPending || isBlocked}
              className="flex items-center gap-1.5 text-sm text-ink-muted border border-border rounded-full px-4 py-2 disabled:opacity-40"
            >
              <MessageCircle size={16} />
              Message
            </button>
            <button
              onClick={handleFollowClick}
              disabled={
                toggleFollow.isPending ||
                sendFollowRequest.isPending ||
                cancelFollowRequest.isPending ||
                isBlocked
              }
              className={`px-5 py-2 rounded-full text-sm font-medium disabled:opacity-40 ${
                isFollowing || hasPendingRequest
                  ? "bg-accent-soft text-accent"
                  : isFollowedByUser
                  ? "bg-pushback/15 text-pushback"
                  : "bg-ink/10 text-ink"
              }`}
            >
              {isFollowing
                ? "Unfollow"
                : hasPendingRequest
                ? "Requested"
                : isFollowedByUser
                ? "Follow back"
                : "Follow"}
            </button>

            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="text-ink-muted p-2"
                aria-label="More options"
              >
                <MoreHorizontal size={18} />
              </button>

              {menuOpen && (
                <div className="absolute top-full right-0 mt-1 bg-canvas border border-border rounded-xl shadow-lg py-1 w-40 z-10">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      void shareProfile();
                    }}
                    className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
                  >
                    <Redo2 size={16} />
                    Share profile
                  </button>
                  <button
                    onClick={() => {
                      toggleMute.mutate(isMuted);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
                  >
                    {isMuted ? "Unmute" : "Mute"}
                  </button>
                  <button
                    onClick={() => {
                      toggleBlock.mutate(isBlocked);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-surface"
                  >
                    {isBlocked ? "Unblock" : "Block"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header: avatar beside name / roles / handle + website */}
        <div className="flex items-start gap-4 mt-4">
          {profile.avatar_url ? (
            <button
              type="button"
              onClick={() => setAvatarOpen(true)}
              className="flex-shrink-0"
              aria-label="View profile photo"
            >
              <Avatar src={profile.avatar_url} name={profile.display_name} size="lg" />
            </button>
          ) : (
            <Avatar src={profile.avatar_url} name={profile.display_name} size="lg" />
          )}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-medium text-lg text-ink">{profile.display_name}</h1>
              <TierBadge tier={profile.tier} />
            </div>

            {profile.roles.length > 0 && (
              <RoleTags roles={profile.roles} className="text-xs text-ink-muted block mt-0.5" />
            )}

            <p className="text-sm text-ink-muted mt-0.5">
              @{profile.username}
              {profile.website_url && (
                <>
                  {" / "}
                  <a
                    href={getWebsiteHref(profile.website_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={profile.website_url}
                    className="inline-flex items-center gap-1 text-accent hover:underline align-bottom max-w-[160px]"
                  >
                    <Globe size={12} className="flex-shrink-0" />
                    <span className="truncate">{getWebsiteDomain(profile.website_url)}</span>
                  </a>
                </>
              )}
            </p>
          </div>
        </div>

        {profile.bio && <p className="text-ink mt-4">{profile.bio}</p>}

        <div className="flex items-center gap-5 mt-4 flex-wrap">
          <Link to={`/profile/${profile.username}/following`} className="text-sm">
            <span className="font-medium text-ink">{profile.following_count}</span>{" "}
            <span className="text-ink-muted">Following</span>
          </Link>
          <Link to={`/profile/${profile.username}/followers`} className="text-sm">
            <span className="font-medium text-ink">{profile.follower_count}</span>{" "}
            <span className="text-ink-muted">Followers</span>
          </Link>
          {/* Owner-only, and only ever the true owner view — never shown
              while previewing as a visitor, since a visitor could never
              see this about themselves either. */}
          {showOwnerView && (
            <span
              className="flex items-center gap-1.5 text-sm text-ink-muted"
              title="Only visible to you"
            >
              <Eye size={14} />
              <span className="font-medium text-ink">{visitCount ?? 0}</span> visits in the last 30 days.
            </span>
          )}
        </div>

        {/* Tabs — hidden entirely for a locked private profile, since
            there's nothing behind either tab for a visitor to switch to.
            Equal width now that Activity has moved out: Posts and
            Projects split the row evenly instead of hugging the left.
            The active indicator is one sliding bar (below) instead of
            each button drawing its own border, so switching tabs springs
            the bar across rather than just appearing under the other
            button — same pattern as Feed's tab row. */}
        {!isPrivateLocked && (
          <div className="relative flex items-stretch mt-6 border-b border-border">
            <button
              onClick={() => handleTabClick(0, "posts")}
              className={`flex-1 text-center text-sm font-medium pb-3 ${
                activeTab === "posts" ? "text-accent" : "text-ink-muted"
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => handleTabClick(1, "projects")}
              className={`flex-1 text-center text-sm font-medium pb-3 ${
                activeTab === "projects" ? "text-accent" : "text-ink-muted"
              }`}
            >
              Projects
            </button>
            <div
              className="ako-tab-indicator absolute bottom-0 left-0 h-[2px] w-1/2 bg-accent rounded-full"
              style={{ transform: `translateX(${activeIndex * 100}%)` }}
            />
          </div>
        )}

        {/* Tab content — swipeable, same gesture as Feed's tab row. Keyed
            by tab so each switch remounts this wrapper and replays the
            spring-in animation; --tab-dir picks which side it comes from
            (see the keyframe in index.css). */}
        <div
          className="mt-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            key={activeTab}
            className="animate-tab-spring"
            style={{ "--tab-dir": tabDirection } as CSSProperties}
          >
          {isBlocked ? (
            <p className="text-ink-muted text-center py-10 text-sm">
              You've blocked this account. Unblock to see their content.
            </p>
          ) : isPrivateLocked ? (
            <div className="flex flex-col items-center text-center py-14 px-6">
              <div className="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center mb-3">
                <Lock size={22} className="text-accent" />
              </div>
              <p className="text-ink font-medium">This account is private</p>
              <p className="text-ink-muted text-sm mt-1 max-w-xs">
                Follow {firstName || "this account"} to see their posts and projects.
              </p>
            </div>
          ) : activeTab === "posts" ? (
            posts && posts.length > 0 ? (
              posts.map((post: any) => (
                <PostCard key={post.id} post={post} isOwnerView={showOwnerView} />
              ))
            ) : (
              <p className="text-ink-muted text-center py-10 text-sm">No posts yet.</p>
            )
          ) : visibleProjects && visibleProjects.length > 0 ? (
            visibleProjects.map((project) => (
              <ProjectCard key={project.id} project={project} isOwnerView={showOwnerView} />
            ))
          ) : (
            <p className="text-ink-muted text-center py-10 text-sm">
              {showOwnerView ? "No projects yet — publish your first one." : "No projects yet."}
            </p>
          )}
          </div>
        </div>
      </div>

      <BottomNav />

      {avatarOpen && profile.avatar_url && (
        <ImageLightbox
          src={profile.avatar_url}
          alt={profile.display_name}
          onClose={() => setAvatarOpen(false)}
        />
      )}

      {showUnfollowConfirm && (
        <div
          className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-6"
          onClick={() => setShowUnfollowConfirm(false)}
        >
          <div
            className="bg-canvas rounded-2xl p-5 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-ink text-sm mb-4 space-y-2">
              {isFollowedByUser && (
                <p>
                  You and {firstName} are friends. Still want to unfollow?
                </p>
              )}
              {profile.is_private && (
                <p>
                  This account is private. If you unfollow, you'll need to send a new follow
                  request and be approved again to follow {firstName}.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUnfollowConfirm(false)}
                className="flex-1 border border-border text-ink-muted py-2.5 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnfollow}
                disabled={toggleFollow.isPending}
                className="flex-1 bg-accent text-canvas py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Unfollow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
