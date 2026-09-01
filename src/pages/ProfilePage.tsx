import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Settings, Wallet, MessageCircle, MoreHorizontal, Plus, Eye, X, Archive, Globe } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProfileByUsername, useIsFollowing, useToggleFollow } from "../hooks/useProfile";
import { useUserPostsWithArchived } from "../hooks/usePosts";
import { useStartConversation } from "../hooks/useMessaging";
import { useIsBlocked, useToggleBlock, useIsMuted, useToggleMute } from "../hooks/usePrivacy";
import { useUserProjects } from "../hooks/useProjects";
import { Avatar } from "../components/Avatar";
import { TierBadge } from "../components/TierBadge";
import { RoleTags } from "../components/RoleTags";
import { PostCard } from "../components/PostCard";
import { ProjectCard } from "../components/ProjectCard";
import { BottomNav } from "../components/BottomNav";

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const startConversation = useStartConversation();
  const [menuOpen, setMenuOpen] = useState(false);

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
  const showOwnerView = isOwnProfile && !previewingAsVisitor;

  const { data: projects } = useUserProjects(profile?.id ?? "", showOwnerView);
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

        {/* Header: avatar beside name / roles / handle + website */}
        <div className="flex items-start gap-4 mt-4">
          <Avatar src={profile.avatar_url} name={profile.display_name} size="lg" />
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
  href={profile.website_url}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-1 text-accent hover:underline"
>
  <Globe size={12} />
  {profile.website_url.replace(/^https?:\/\//, "")}
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

        {/* Tab content */}
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
