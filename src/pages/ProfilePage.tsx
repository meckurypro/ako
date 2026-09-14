// src/pages/ProfilePage.tsx
import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Settings, Wallet, MessageCircle, MoreHorizontal, Plus, Eye, X, Globe, UserCheck, Lock, Redo2, Building2, ArrowUp, Undo2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProfileByUsername, useIsFollowing, useIsFollowedByUser, useToggleFollow } from "../hooks/useProfile";
import { useTabState } from "../hooks/useTabState";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { SwipeableTabs } from "../components/SwipeableTabs";
import { DropdownMenu, type DropdownMenuItem } from "../components/DropdownMenu";
import {
  useHasPendingFollowRequest,
  useSendFollowRequest,
  useCancelFollowRequest,
  useIncomingFollowRequestCount,
} from "../hooks/useFollowRequests";
import { useUserPostsWithArchived } from "../hooks/usePosts";
import { useStartConversation } from "../hooks/useMessaging";
import { useIsBlocked, useToggleBlock, useIsMuted, useToggleMute, useRemoveFollower } from "../hooks/usePrivacy";
import { useContactNickname } from "../hooks/useContactNicknames";
import { useUserProjects } from "../hooks/useProjects";
import { useRecordProfileVisit } from "../hooks/useProfileVisits";
import { Avatar } from "../components/Avatar";
import { AccountSwitcher } from "../components/AccountSwitcher";
import { ImageLightbox } from "../components/ImageLightbox";
import { ShareProfileSheet } from "../components/ShareProfileSheet";
import { ProfileShareScreen } from "../components/ProfileShareScreen";
import { useToast } from "../components/Toast";
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

// How far down the page (px, plain window.scrollY) before the
// "scroll to top" FAB appears.
const SCROLL_TOP_THRESHOLD = 480;

// Tier 1's rendered height — the always-sticky toolbar row (see the
// wrapper below). Tier 2 (the Posts/Projects tab bar) docks its own
// `top` offset directly under this, via the matching `top-14`
// Tailwind class, so the two numbers can't silently drift apart.
// h-14 === 56px === top-14.
const TOOLBAR_HEIGHT_CLASS = "h-14";

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const startConversation = useStartConversation();
  const toast = useToast();
  // Separate menu from the visitor-side "Send to" sheet below — the
  // owner's dropdown (Share profile / View as visitor / Follow
  // requests / Wallet / Settings) needs its own open state and its
  // own anchor button.
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const ownerMenuButtonRef = useRef<HTMLButtonElement>(null);
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  // Whether there's anything to actually switch between — if this is
  // the only account on the device, tapping the name should skip
  // straight to adding one instead of opening a dropdown with just
  // "You" and an "Add account" row in it.
  // Always opens the same AccountSwitcher dropdown now, regardless of
  // whether there's anyone else saved yet — it already renders "You"
  // plus an "Add account" row unconditionally (see AccountSwitcher.tsx),
  // so there was never a real need to skip past it. Jumping straight
  // to the full /login?add=1 page when this is the only account on the
  // device read as an unexplained forced logout; a small, familiar
  // dropdown with an explicit "Add account" row makes what's about to
  // happen obvious before it happens.
  function handleAccountNameClick() {
    setAccountSwitcherOpen((o) => !o);
  }
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  useBackDismiss(() => setShowUnfollowConfirm(false), showUnfollowConfirm);
  useScrollLock(showUnfollowConfirm);

  const [previewingAsVisitor, setPreviewingAsVisitor] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  // Visitor's consolidated "Send to" sheet (see ShareProfileSheet) and
  // the owner's full-screen QR share takeover (see ProfileShareScreen)
  // — mutually exclusive, but kept as separate flags since they're
  // reached from different toolbar states and never both apply.
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [qrShareOpen, setQrShareOpen] = useState(false);

  // "Back to post" FAB — set once, from the router state a Feed post's
  // byline attaches when it sends a visitor here (see the identityHref
  // Links in PostCard.tsx). Read via a lazy initializer so it survives
  // exactly one mount, then the history entry's own state is cleared
  // the same way Feed does for its justPostedId — paging back/forward
  // through history afterward shouldn't keep re-arming this on a page
  // that's no longer "freshly arrived from that post".
  const [fromFeedPost] = useState<{ id: string } | null>(
    () => (location.state as { fromFeedPost?: { id: string } } | null)?.fromFeedPost ?? null
  );
  useEffect(() => {
    if (fromFeedPost) window.history.replaceState({}, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleBackToFeedPost() {
    if (!fromFeedPost) return;
    navigate("/feed", { state: { scrollToPostId: fromFeedPost.id } });
  }

  // "Scroll to top" FAB — purely a function of raw scroll position,
  // not any layout measurement, so it stays correct regardless of how
  // tall the (now non-sticky) avatar/bio/stats block above the tabs
  // happens to render for any given profile.
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    function onScroll() {
      setShowScrollTop(window.scrollY > SCROLL_TOP_THRESHOLD);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: profile, isLoading } = useProfileByUsername(username!);
  // Lets a shared project link (?tab=projects) land directly on the
  // Projects tab, and now also survives a refresh either way — see
  // useTabState.
  const [activeTab, setActiveTab] = useTabState<ProfileTab>(TABS, "posts");
  // Continuous tab position fed by SwipeableTabs' onProgress, same idea as
  // Feed's tab row — lets the sliding indicator bar track the finger
  // during a drag instead of only jumping once the swipe commits.
  const [tabProgress, setTabProgress] = useState(TABS.indexOf(activeTab));
  const [tabDragging, setTabDragging] = useState(false);

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
  const removeFollower = useRemoveFollower(profile?.id ?? "");
  // Private, viewer-only override for how this profile's name reads to
  // ME (see "Customise name" in ShareProfileSheet) — never touches the
  // profile itself, so it only ever changes what I see.
  const { data: nickname } = useContactNickname(profile?.id ?? "");

  const isOwnProfile = user?.id === profile?.id;
  const showOwnerView = isOwnProfile && !previewingAsVisitor;

  const isFollowing = !!isFollowingQuery.data;
  const isFollowedByUser = !!isFollowedByUserQuery.data;
  const hasPendingRequest = !!hasPendingRequestQuery.data;
  const isBlocked = !!isBlockedQuery.data;
  const isMuted = !!isMutedQuery.data;
  // A nickname only ever overrides what I, personally, see — it never
  // changes profile.display_name itself, so anything that needs the
  // real name (unfollow confirm copy, share text, etc.) keeps reading
  // profile.display_name directly and only the on-screen labels below
  // swap to displayName.
  const displayName = nickname || profile?.display_name || "";
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

  // Recording a visit is safe to fire on every mount (it no-ops for
  // self-visits inside the hook). The 30-day visit COUNT itself no
  // longer lives on this page at all — it moved to Settings → Profile
  // (see Settings.tsx), since it's an owner-facing stat about the
  // account, not something a visitor scrolling this profile needs to
  // see mixed in with Following/Followers.
  useRecordProfileVisit(profile?.id);

  // Outside-click / back-dismiss for both "…" menus (visitor-side
  // mute/block, owner-side options) is handled internally by
  // <DropdownMenu> now.

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

  // Owner sharing their OWN profile gets the full-screen QR takeover
  // (see ProfileShareScreen) — a visitor sees the consolidated "Send
  // to" sheet instead (see ShareProfileSheet, wired into the visitor
  // toolbar below), matching how each audience actually wants to
  // hand the link off.
  function handleShareProfile() {
    setOwnerMenuOpen(false);
    setQrShareOpen(true);
  }

  function handleRemoveFollower() {
    removeFollower.mutate(undefined, {
      onSuccess: () => {
        setShareSheetOpen(false);
        toast(`Removed ${firstName || "this follower"}.`, { variant: "success" });
      },
    });
  }

  // Same swipe pattern as Feed's tab row — SwipeableTabs is bound only to
  // the content area below the tab bar (see the wrapping div further
  // down), so swiping over the header/bio never accidentally flips tabs.
  const activeIndex = TABS.indexOf(activeTab);

  function handleTabClick(index: number, tab: ProfileTab) {
    if (index === activeIndex) return;
    setActiveTab(tab);
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
      {/* Tier 1 — the only always-sticky piece of the header. Whichever
          toolbar variant is showing (owner's Plus/⋯, a visitor's
          Message/Follow/⋯, or the "Exit preview" control while the
          owner is previewing as a visitor) renders inside a fixed-height
          row so Tier 2 below has a stable offset to dock under. */}
      <div className="sticky top-0 z-30 bg-canvas shadow-[0_2px_8px_-4px_rgba(var(--shadow-ink-rgb),0.10)]">
        <div className={`max-w-xl mx-auto px-4 ${TOOLBAR_HEIGHT_CLASS} flex items-center`}>
          {showOwnerView ? (
            <div className="flex items-center justify-end gap-1 w-full">
              <Link to="/create" state={{ background: location }} aria-label="Create" className="p-2 text-ink-muted">
                <Plus size={22} />
              </Link>

              <div className="relative">
                <button
                  ref={ownerMenuButtonRef}
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
                  <DropdownMenu
                    anchorRef={ownerMenuButtonRef}
                    onClose={() => setOwnerMenuOpen(false)}
                    widthClass="w-64"
                    items={[
                      { key: "share", label: "Share profile", icon: <Redo2 />, onSelect: handleShareProfile },
                      {
                        key: "page",
                        label: "Page",
                        icon: <Building2 />,
                        onSelect: () => {
                          setOwnerMenuOpen(false);
                          navigate("/pages");
                        },
                      },
                      {
                        key: "view-as-visitor",
                        label: "View as visitor",
                        icon: <Eye />,
                        onSelect: () => setPreviewingAsVisitor(true),
                      },
                      ...(profile.is_private
                        ? ([
                            {
                              key: "follow-requests",
                              label: "Follow requests",
                              icon: <UserCheck />,
                              badge:
                                incomingRequestCount > 0 ? (
                                  <span className="bg-danger text-canvas text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                                    {incomingRequestCount > 9 ? "9+" : incomingRequestCount}
                                  </span>
                                ) : undefined,
                              onSelect: () => navigate("/requests"),
                            },
                          ] satisfies DropdownMenuItem[])
                        : []),
                      { key: "wallet", label: "Wallet", icon: <Wallet />, onSelect: () => navigate("/wallet") },
                      { key: "settings", label: "Settings", icon: <Settings />, onSelect: () => navigate("/settings/profile") },
                    ]}
                  />
                )}
              </div>
            </div>
          ) : isOwnProfile ? (
            // Previewing own profile as a visitor sees it. The
            // explanatory banner scrolls with the rest of the header
            // now (see below), but the control to leave preview mode
            // stays reachable up here at all times, scrolled or not.
            <div className="flex items-center justify-end w-full">
              <button
                onClick={() => setPreviewingAsVisitor(false)}
                className="flex items-center gap-1 text-sm text-accent font-medium px-2 py-1.5"
              >
                <X size={14} />
                Exit preview
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2 relative w-full">
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

              <button
                onClick={() => setShareSheetOpen(true)}
                className="text-ink-muted p-2"
                aria-label="More options"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Non-sticky header content — banner, avatar/name/roles/handle,
          bio, and the Following/Followers stats row. This scrolls
          away underneath Tier 1 above, same as any other page content;
          only the toolbar row and the tab bar (Tier 2, further down)
          stay pinned. */}
      <div className="max-w-xl mx-auto px-4 pt-4">
        {/* Preview-mode banner — informational only now; the actual
            "Exit" control lives in the always-reachable Tier 1 bar
            above, so this can scroll away without taking the exit
            with it. */}
        {isOwnProfile && previewingAsVisitor && (
          <div className="flex items-center gap-1.5 bg-accent-soft text-accent text-sm rounded-xl px-4 py-2.5 mb-4">
            <Eye size={14} />
            Viewing your profile as a visitor sees it
          </div>
        )}

        {/* Header: avatar beside name / roles / handle + website */}
        <div className="flex items-start gap-4">
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
              {showOwnerView ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleAccountNameClick}
                    className="flex items-center gap-1"
                  >
                    <h1 className="font-medium text-lg text-ink">{profile.display_name}</h1>
                  </button>
                  {accountSwitcherOpen && (
                    <AccountSwitcher onClose={() => setAccountSwitcherOpen(false)} />
                  )}
                </div>
              ) : (
                <h1 className="font-medium text-lg text-ink">{displayName}</h1>
              )}
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

        {/* Visit count ("X visits in the last 30 days") moved to
            Settings → Profile — it's an owner-facing stat about the
            account, not part of what belongs in this Following/
            Followers row (see Settings.tsx). */}
        <div className="flex items-center gap-5 mt-4 mb-4 flex-wrap">
          <Link to={`/profile/${profile.username}/following`} className="text-sm">
            <span className="font-medium text-ink">{profile.following_count}</span>{" "}
            <span className="text-ink-muted">Following</span>
          </Link>
          <Link to={`/profile/${profile.username}/followers`} className="text-sm">
            <span className="font-medium text-ink">{profile.follower_count}</span>{" "}
            <span className="text-ink-muted">Followers</span>
          </Link>
        </div>
      </div>

      {/* Tier 2 — the Posts/Projects tab bar. Its own sticky element,
          docking directly under Tier 1 (top-14 === Tier 1's h-14) once
          the avatar/bio/stats block above has scrolled past. Hidden
          entirely for a locked private profile, same as before, since
          there's nothing behind either tab for a visitor to switch to. */}
      {!isPrivateLocked && (
        <div className="sticky top-14 z-20 bg-canvas shadow-[0_2px_8px_-4px_rgba(var(--shadow-ink-rgb),0.10)]">
          <div className="max-w-xl mx-auto px-4">
            {/* Equal width, same sliding-indicator treatment as before —
                only the wrapper around this moved, not the tab row
                itself. */}
            <div className="relative flex items-stretch border-b border-border">
              <button
                onClick={() => handleTabClick(0, "posts")}
                className={`flex-1 text-center text-sm font-medium pt-3 pb-3 ${
                  activeTab === "posts" ? "text-accent" : "text-ink-muted"
                }`}
              >
                Posts
              </button>
              <button
                onClick={() => handleTabClick(1, "projects")}
                className={`flex-1 text-center text-sm font-medium pt-3 pb-3 ${
                  activeTab === "projects" ? "text-accent" : "text-ink-muted"
                }`}
              >
                Projects
              </button>
              <div
                className={`ako-tab-indicator absolute bottom-0 left-0 h-[2px] w-1/2 bg-accent rounded-full ${
                  tabDragging ? "ako-tab-indicator--dragging" : ""
                }`}
                style={{ transform: `translateX(${tabProgress * 100}%)` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto px-4">
        {/* Tab content — real drag-tracking carousel, same as Feed's tab
            row (see SwipeableTabs.tsx). A locked/blocked profile has
            nothing behind either tab, so it skips the carousel and just
            shows the one relevant message instead of two identical panes. */}
        <div className="mt-4">
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
          ) : (
            <SwipeableTabs
              index={activeIndex}
              onIndexChange={(i) => setActiveTab(TABS[i])}
              onProgress={(progress, dragging) => {
                setTabProgress(progress);
                setTabDragging(dragging);
              }}
            >
              {[
                <div key="posts">
                  {posts && posts.length > 0 ? (
                    posts.map((post: any) => (
                      <PostCard key={post.id} post={post} isOwnerView={showOwnerView} />
                    ))
                  ) : (
                    <p className="text-ink-muted text-center py-10 text-sm">No posts yet.</p>
                  )}
                </div>,
                <div key="projects">
                  {visibleProjects && visibleProjects.length > 0 ? (
                    visibleProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} isOwnerView={showOwnerView} />
                    ))
                  ) : (
                    <p className="text-ink-muted text-center py-10 text-sm">
                      {showOwnerView ? "No projects yet — publish your first one." : "No projects yet."}
                    </p>
                  )}
                </div>,
              ]}
            </SwipeableTabs>
          )}
        </div>
      </div>

      <BottomNav />

      {/* Floating action buttons. Stacked bottom-right, above BottomNav
          (which sits at z-40 — these stay under it, but the two never
          overlap spatially since this sits well above the nav's own
          height + safe area). "Back to post" only ever appears when
          this page was actually reached via a specific post's byline
          in the Feed (see fromFeedPost above); "scroll to top" is
          purely a function of scroll position. ako-pill-in gives each
          one the same soft scale+fade arrival already used for other
          "something just appeared" moments (see FollowButton.tsx). */}
      <div className="fixed right-4 z-30 flex flex-col items-end gap-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]">
        {fromFeedPost && (
          <button
            onClick={handleBackToFeedPost}
            className="ako-pill-in flex items-center gap-1.5 bg-ink text-canvas text-sm font-medium pl-3 pr-4 py-2.5 rounded-full shadow-lg"
            aria-label="Back to the post you came from"
          >
            <Undo2 size={16} />
            Back to post
          </button>
        )}
        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="ako-pill-in w-11 h-11 flex items-center justify-center bg-canvas border border-border text-ink rounded-full shadow-lg"
            aria-label="Scroll to top"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>

      {avatarOpen && profile.avatar_url && (
        <ImageLightbox
          src={profile.avatar_url}
          alt={profile.display_name}
          onClose={() => setAvatarOpen(false)}
        />
      )}

      {shareSheetOpen && !showOwnerView && (
        <ShareProfileSheet
          profile={{
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          }}
          isFollowedByUser={isFollowedByUser}
          isBlocked={isBlocked}
          isMuted={isMuted}
          onToggleBlock={() => toggleBlock.mutate(isBlocked)}
          onToggleMute={() => toggleMute.mutate(isMuted)}
          onRemoveFollower={handleRemoveFollower}
          onMessage={handleMessage}
          onOpenQR={() => setQrShareOpen(true)}
          onClose={() => setShareSheetOpen(false)}
        />
      )}

      {qrShareOpen && (
        <ProfileShareScreen
          name={profile.display_name}
          handle={profile.username}
          avatarUrl={profile.avatar_url}
          url={`${window.location.origin}/profile/${profile.username}`}
          onClose={() => setQrShareOpen(false)}
        />
      )}

      {showUnfollowConfirm && (
        <div
          className="fixed inset-0 bg-canvas/70 backdrop-blur-overlay flex items-center justify-center z-50 px-6"
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
