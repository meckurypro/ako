import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Globe, Settings, Bookmark, MessageCircle, MoreVertical } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProfileByUsername, useUserPosts, useIsFollowing, useToggleFollow } from "../hooks/useProfile";
import { useStartConversation } from "../hooks/useMessaging";
import { useIsBlocked, useToggleBlock, useIsMuted, useToggleMute } from "../hooks/usePrivacy";
import { Avatar } from "../components/Avatar";
import { TierBadge } from "../components/TierBadge";
import { PostCard } from "../components/PostCard";
import { BottomNav } from "../components/BottomNav";

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const startConversation = useStartConversation();
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: profile, isLoading } = useProfileByUsername(username!);
  const { data: posts } = useUserPosts(profile?.id ?? "");
  const isFollowingQuery = useIsFollowing(profile?.id ?? "");
  const toggleFollow = useToggleFollow(profile?.id ?? "");
  const isBlockedQuery = useIsBlocked(profile?.id ?? "");
  const toggleBlock = useToggleBlock(profile?.id ?? "");
  const isMutedQuery = useIsMuted(profile?.id ?? "");
  const toggleMute = useToggleMute(profile?.id ?? "");

  const isOwnProfile = user?.id === profile?.id;
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
        <div className="flex items-start justify-between">
          <Avatar src={profile.avatar_url} name={profile.display_name} size="lg" />

          {isOwnProfile ? (
            <div className="flex items-center gap-2">
              <Link
                to="/bookmarks"
                className="flex items-center gap-1.5 text-sm text-ink-muted border border-border rounded-full px-4 py-2"
              >
                <Bookmark size={16} />
                Saved
              </Link>
              <Link
                to="/settings/profile"
                className="flex items-center gap-1.5 text-sm text-ink-muted border border-border rounded-full px-4 py-2"
              >
                <Settings size={16} />
                Edit
              </Link>
            </div>
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
                <MoreVertical size={18} />
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
        <p className="text-ink-muted text-sm">@{profile.username}</p>

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

        <div className="mt-8">
          {isBlocked ? (
            <p className="text-ink-muted text-center py-10 text-sm">
              You've blocked this account. Unblock to see their posts.
            </p>
          ) : posts && posts.length > 0 ? (
            posts.map((post: any) => <PostCard key={post.id} post={post} />)
          ) : (
            <p className="text-ink-muted text-center py-10 text-sm">No posts yet.</p>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
