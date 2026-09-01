// src/pages/ProfilePage.tsx
import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Globe, Settings, Wallet, MessageCircle, MoreHorizontal, Plus, Eye, X, Archive } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProfileByUsername, useIsFollowing, useToggleFollow } from "../hooks/useProfile";
import { useUserPostsWithArchived } from "../hooks/usePosts";
import { useStartConversation } from "../hooks/useMessaging";
import { useIsBlocked, useToggleBlock, useIsMuted, useToggleMute } from "../hooks/usePrivacy";
import { useUserProjects } from "../hooks/useProjects";
import { Avatar } from "../components/Avatar";
import { TierBadge } from "../components/TierBadge";
import { PostCard } from "../components/PostCard";
import { ProjectCard } from "../components/ProjectCard";
import { BottomNav } from "../components/BottomNav";

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const startConversation = useStartConversation();
  const [menuOpen, setMenuOpen] = useState(false);

  // When true, an owner sees their profile exactly as a visitor
  // would — owner-only controls hidden, only published (active)
  // projects shown. Meaningless for non-owners, so it's gated behind
  // isOwnProfile everywhere it's used below.
  const [previewingAsVisitor, setPreviewingAsVisitor] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { data: profile, isLoading } = useProfileByUsername(username!);
  const [activeTab, setActiveTab] = useState<"posts" | "projects">("posts");
  const isFollowingQuery = useIsFollowing(profile?.id ?? "");
  const toggleFollow = useToggleFollow(profile?.id ?? "");
  const isBlockedQuery = useIsBlocked(profile?.id ?? "");
  const toggleBlock = useToggleBlock(profile?.id ?? "");
  const isMutedQuery = useIsMuted(profile?.id ?? "");
  const toggleMute = useToggleMute(profile?.id ?? "");

  const isOwnProfile = user?.id === profile?.id;
  // The one flag that actually gates owner-only UI and data below —
  // true owner-ness AND not currently previewing as a visitor.
  const showOwnerView = isOwnProfile && !previewingAsVisitor;

  // Owner sees all statuses (to manage drafts/archived); everyone
  // else — including the owner while previewing — only sees
  // published (active) projects, same as any other visitor would.
  const { data: projects } = useUserProjects(profile?.id ?? "", showOwnerView);

  // Same idea for posts: only the owner (not previewing) can flip
  // showArchived on to review/restore their own archived posts.
  const { data: posts } = useUserPostsWithArchived(
    profile?.id ?? "",
    showOwnerView && showArchived
  );

  const isFollowing = !!isFollowingQuery.data;
  const isBlocked = !!isBlockedQuery.data;
  const isMuted = !!isMutedQuery.data;

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
        {/* Preview-mode banner — only an owner can ever see this,
            and it's the one clear way back to their real view. */}
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

        <div className="flex items-start justify-between">
          <Avatar src={profile.avatar_url} name={profile.display_name} size="lg" />

          {showOwnerView ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewingAsVisitor(true)}
                className="flex items-center gap-1.5 text-sm text-ink-muted border border-border rounded-full px-4 py-2"
              >
                <Eye size={16} />
                Visitor View
              </button>
              <Link
                to="/wallet"
                className="flex items-center gap-1.5 text-sm text-ink-muted border border-border rounded-full px-4 py-2"
              >
                <Wallet size={16} />
                Wallet
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
            // Own profile, but previewing as a visitor: show none of
            // the real visitor actions (message/follow/block a
            // visitor would see for someone else) since those don't
            // meaningfully apply to yourself — just the plain layout.
            null
          ) : (
            <div className="flex items-center gap-2 relative">
              <button
                onClick={handleMessage}
                disabled={startConversation.isPending || isBlocked}
                className="flex items-center gap-1.5 text-sm text-ink-muted border border-border rounded-full px-4 py-2 disabled:opacity-40"
              >
                <MessageCircle size={16} />
                Message
              </button>
              <button
                onClick={() => toggleFollow.mutate(isFollowing)}
                disabled={toggleFollow.isPending || isBlocked}
                className={`px-5 py-2 rounded-full text-sm font-medium disabled:opacity-40 ${
                  isFollowing ? "bg-accent-soft text-accent" : "bg-accent text-canvas"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>

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
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <h1 className="font-display text-2xl text-ink">{profile.display_name}</h1>
          <TierBadge tier={profile.tier} />
        </div>
        <p className="text-ink-muted text-sm">
          @{profile.username}
          {profile.role && <span> · {profile.role.label}</span>}
        </p>

        {profile.bio && <p className="text-ink mt-3">{profile.bio}</p>}

        {profile.website_url && (
          <a
            href={profile.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-accent mt-2 hover:underline"
          >
            <Globe size={14} />
            {profile.website_url.replace(/^https?:\/\//, "")}
          </a>
        )}

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
              <Archive size={16} />
              Archived
            </button>
          )}
          {showOwnerView && activeTab === "projects" && (
            <Link
              to="/projects/new"
              className="ml-auto flex items-center gap-1 text-sm text-accent font-medium pb-3"
            >
              <Plus size={16} />
              New
            </Link>
          )}
        </div>

        <div className="mt-4">
          {isBlocked ? (
            <p className="text-ink-muted text-center py-10 text-sm">
              You've blocked this account. Unblock to see their content.
            </p>
          ) : activeTab === "posts" ? (
            posts && posts.length > 0 ? (
              posts.map((post: any) => <PostCard key={post.id} post={post} />)
            ) : (
              <p className="text-ink-muted text-center py-10 text-sm">No posts yet.</p>
            )
          ) : projects && projects.length > 0 ? (
            projects.map((project) => <ProjectCard key={project.id} project={project} />)
          ) : (
            <p className="text-ink-muted text-center py-10 text-sm">
              {showOwnerView ? "No projects yet — publish your first one." : "No projects yet."}
            </p>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
