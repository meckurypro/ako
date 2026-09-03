import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { Settings, Wallet, MessageCircle, MoreHorizontal, Plus, Eye, X, Archive, Globe, UserCheck } from "lucide-react";
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

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const startConversation = useStartConversation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);

  const [previewingAsVisitor, setPreviewingAsVisitor] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const { data: profile, isLoading } = useProfileByUsername(username!);
  const [searchParams] = useSearchParams();
  // Lets a shared project link (?tab=projects) land directly on the
  // Projects tab instead of Posts. Read once on mount — the tabs are
  // still plain buttons after that, so clicking Posts/Projects
  // doesn't fight the URL.
  const [activeTab, setActiveTab] = useState<"posts" | "projects">(
    searchParams.get("tab") === "projects" ? "projects" : "posts"
  );
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

  const { data: projects } = useUserProjects(profile?.id ?? "", showOwnerView);

  // Archived projects only ever come back at all when showOwnerView is
  // true (see useUserProjects) — split them out here so the main
  // Projects tab never mixes them in with active/draft ones; the
  // "Archived" toggle swaps to the archived-only view instead.
  const visibleProjects = showArchivedProjects
    ? projects?.filter((p) => p.status === "archived")
    : projects?.filter((p) => p.status !== "archived");
  const { data: posts } = useUserPostsWithArchived(
    profile?.id ?? "",
    showOwnerView && showArchived
  );

  const isFollowing = !!isFollowingQuery.data;
  const isFollowedByUser = !!isFollowedByUserQuery.data;
  const hasPendingRequest = !!hasPendingRequestQuery.data;
  const isBlocked = !!isBlockedQuery.data;
  const isMuted = !!isMutedQuery.data;
  const firstName = profile?.display_name?.trim().split(/\s+/)[0] ?? "";

  // Outside-click / outside-tap closes the "…" menu. It only listened
  // for clicks on the toggle button itself before, so tapping anywhere
  // else on the page while it was open did nothing.
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
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setPreviewingAsVisitor(true)}
              className="flex items-center gap-1.5 text-sm text-ink-muted border border-border rounded-full px-4 py-2"
            >
              <Eye size={16} />
              Visitor
            </button>
            <Link
              to="/requests"
              aria-label="Follow requests"
              className="relative flex items-center justify-center text-ink-muted border border-border rounded-full p-2"
            >
              <UserCheck size={16} />
              {incomingRequestCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-danger text-canvas text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
                  {incomingRequestCount > 9 ? "9+" : incomingRequestCount}
                </span>
              )}
            </Link>
            <Link
              to="/wallet"
              aria-label="Wallet"
              className="flex items-center justify-center text-ink-muted border border-border rounded-full p-2"
            >
              <Wallet size={16} />
            </Link>
            <Link
              to="/settings/profile"
              aria-label="Edit profile"
              className="flex items-center justify-center text-ink-muted border border-border rounded-full p-2"
            >
              <Settings size={16} />
            </Link>
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
                isFollowing || hasPendingRequest ? "bg-accent-soft text-accent" : "bg-accent text-canvas"
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

        <div className="flex items-center gap-5 mt-4">
          <Link to={`/profile/${profile.username}/following`} className="text-sm">
            <span className="font-medium text-ink">{profile.following_count}</span>{" "}
            <span className="text-ink-muted">Following</span>
          </Link>
          <Link to={`/profile/${profile.username}/followers`} className="text-sm">
            <span className="font-medium text-ink">{profile.follower_count}</span>{" "}
            <span className="text-ink-muted">Followers</span>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mt-6 border-b border-border">
          <button
            onClick={() => setActiveTab("posts")}
            className={`text-sm font-medium pb-3 border-b-2 -mb-px ${
              activeTab === "posts" ? "text-accent border-accent" : "text-ink-muted border-transparent"
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`text-sm font-medium pb-3 border-b-2 -mb-px ${
              activeTab === "projects" ? "text-accent border-accent" : "text-ink-muted border-transparent"
            }`}
          >
            Projects
          </button>
          {showOwnerView && activeTab === "posts" && (
            <button
              onClick={() => setShowArchived((v) => !v)}
              className={`ml-auto flex items-center gap-1 text-sm font-medium pb-3 ${
                showArchived ? "text-accent" : "text-ink-muted"
              }`}
            >
              <span
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${
                  showArchived ? "bg-accent-soft" : ""
                }`}
              >
                <Archive size={16} />
                Archived
              </span>
            </button>
          )}
          {showOwnerView && activeTab === "projects" && (
            // Archived stays in the same trailing slot it occupies on the
            // Posts tab (ml-auto, rightmost) — New moves before it instead
            // of after, so the position of "Archived" never shifts between
            // tabs; only what it renders (posts vs. projects) changes.
            <div className="ml-auto flex items-center gap-4">
              <Link
                to="/projects/new"
                className="flex items-center gap-1 text-sm text-accent font-medium pb-3"
              >
                <Plus size={16} />
                New
              </Link>
              <button
                onClick={() => setShowArchivedProjects((v) => !v)}
                className={`flex items-center gap-1 text-sm font-medium pb-3 ${
                  showArchivedProjects ? "text-accent" : "text-ink-muted"
                }`}
              >
                <span
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${
                    showArchivedProjects ? "bg-accent-soft" : ""
                  }`}
                >
                  <Archive size={16} />
                  Archived
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Tab content */}
        <div className="mt-4">
          {isBlocked ? (
            <p className="text-ink-muted text-center py-10 text-sm">
              You've blocked this account. Unblock to see their content.
            </p>
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
              {showArchivedProjects
                ? "No archived projects."
                : showOwnerView
                ? "No projects yet — publish your first one."
                : "No projects yet."}
            </p>
          )}
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
