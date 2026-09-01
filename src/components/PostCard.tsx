import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MessageCircle,
  MoreHorizontal,
  Heart,
  ThumbsDown,
  Share2,
  Bookmark,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  Globe,
} from "lucide-react";
import { Avatar } from "./Avatar";
import { TierBadge } from "./TierBadge";
import { RoleTags } from "./RoleTags";
import { ReactionTray, type EngagementAction } from "./ReactionTray";
import { PostMedia } from "./PostMedia";
import { PostContent } from "./PostContent";
import { useAuth } from "../hooks/useAuth";
import { useIsBookmarked, useToggleBookmark } from "../hooks/useBookmarks";
import { useMyReaction, useToggleReaction } from "../hooks/useReactions";
import { canEditPost, useDeletePost, useSetPostArchived } from "../hooks/usePosts";
import { shortDisplayName } from "../lib/displayName";
import type { PostWithAuthor } from "../types/database";

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const DOUBLE_TAP_WINDOW_MS = 300;

export function PostCard({ post }: { post: PostWithAuthor }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwner = user?.id === post.author_id;
  const [menuOpen, setMenuOpen] = useState(false);
  const lastTapRef = useRef(0);

  const isBookmarkedQuery = useIsBookmarked(post.id);
  const toggleBookmark = useToggleBookmark(post.id);
  const isBookmarked = !!isBookmarkedQuery.data;

  const likeQuery = useMyReaction(post.id, "post", "like");
  const dislikeQuery = useMyReaction(post.id, "post", "dislike");
  const toggleLike = useToggleReaction(post.id, "post", "like");
  const toggleDislike = useToggleReaction(post.id, "post", "dislike");
  const toggleShare = useToggleReaction(post.id, "post", "share");
  const isLiked = !!likeQuery.data;
  const isDisliked = !!dislikeQuery.data;

  const deletePost = useDeletePost();
  const setArchived = useSetPostArchived();
  const editable = isOwner && canEditPost(post);

  // Double-tap-to-like on the content area — a second tap arriving
  // within the window counts as a double tap; a single tap still
  // falls through to the normal "open post" Link underneath.
  function handleContentTap() {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_WINDOW_MS) {
      if (!isLiked) toggleLike.mutate(false);
    }
    lastTapRef.current = now;
  }

  async function handleShare() {
    setMenuOpen(false);
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        // User cancelled the share sheet — not an error worth surfacing.
        return;
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
    // Still record the share for the count, same as before.
    toggleShare.mutate(false);
  }

  function handleDelete() {
    setMenuOpen(false);
    if (window.confirm("Delete this post? This can't be undone.")) {
      deletePost.mutate(post.id);
    }
  }

  // Built once per render from current reaction state, then handed to
  // ReactionTray as the row of quick-action buttons under the post.
  // ReactionTray itself is purely presentational — it just renders
  // whatever actions it's given (see ReactionTray.tsx).
  const reactionActions: EngagementAction[] = [
    {
      key: "like",
      label: isLiked ? "Liked" : "Like",
      icon: (
        <Heart
          size={20}
          fill={isLiked ? "currentColor" : "none"}
          className={isLiked ? "text-accent" : ""}
        />
      ),
      count: post.like_count > 0 ? post.like_count : null,
      onClick: () => toggleLike.mutate(isLiked),
    },
    {
      key: "dislike",
      label: isDisliked ? "Disliked" : "Dislike",
      icon: (
        <ThumbsDown
          size={20}
          fill={isDisliked ? "currentColor" : "none"}
          className={isDisliked ? "text-danger" : ""}
        />
      ),
      count: post.dislike_count > 0 ? post.dislike_count : null,
      onClick: () => toggleDislike.mutate(isDisliked),
    },
    {
      key: "share",
      label: "Share",
      icon: <Share2 size={20} />,
      count: post.share_count > 0 ? post.share_count : null,
      onClick: () => {
        void handleShare();
      },
    },
    {
      key: "bookmark",
      label: isBookmarked ? "Saved" : "Save",
      icon: (
        <Bookmark
          size={20}
          fill={isBookmarked ? "currentColor" : "none"}
          className={isBookmarked ? "text-accent" : ""}
        />
      ),
      count: null,
      onClick: () => toggleBookmark.mutate(isBookmarked),
    },
  ];

  return (
<article className="bg-surface rounded-2xl p-4 mb-4 relative shadow-[0_1px_3px_rgba(31,29,26,0.05),0_6px_16px_-6px_rgba(31,29,26,0.10)]">
      <div className="flex items-start gap-3">
        <Link to={`/profile/${post.author.username}`}>
          <Avatar src={post.author.avatar_url} name={post.author.display_name} />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/profile/${post.author.username}`}
              className="font-medium text-ink hover:underline"
            >
              {shortDisplayName(post.author.display_name)}
            </Link>
            <TierBadge tier={post.author.tier} />
          </div>

          {post.author.roles.length > 0 && (
            <RoleTags roles={post.author.roles} className="text-xs text-ink-muted block" />
          )}

          <p className="text-xs text-ink-muted flex items-center gap-1">
            <span>
              {timeAgo(post.created_at)}
              {post.edited_at && " · edited"}
            </span>
            {post.visibility === "public" && <Globe size={12} />}
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="text-ink-muted p-1"
            aria-label="Post options"
          >
            <MoreHorizontal size={18} />
          </button>

          {menuOpen && (
            <>
              {/* Full-screen backdrop below the menu but above everything
                  else — a tap anywhere outside the menu lands here and
                  only closes it, instead of falling through to the post's
                  own tap-to-like/open-post handlers underneath. */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute top-full right-0 mt-1 bg-canvas border border-border rounded-xl shadow-lg py-1 w-48 z-20">
                <button
                  onClick={() => {
                    toggleLike.mutate(isLiked);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-ink hover:bg-surface"
                >
                  <span className="flex items-center gap-2">
                    <Heart size={14} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "text-accent" : ""} />
                    {isLiked ? "Unlike" : "Like"}
                  </span>
                  {post.like_count > 0 && <span className="text-ink-muted">{post.like_count}</span>}
                </button>

                <button
                  onClick={() => {
                    toggleDislike.mutate(isDisliked);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-ink hover:bg-surface"
                >
                  <span className="flex items-center gap-2">
                    <ThumbsDown size={14} fill={isDisliked ? "currentColor" : "none"} className={isDisliked ? "text-danger" : ""} />
                    {isDisliked ? "Remove dislike" : "Dislike"}
                  </span>
                  {post.dislike_count > 0 && <span className="text-ink-muted">{post.dislike_count}</span>}
                </button>

                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-ink hover:bg-surface"
                >
                  <span className="flex items-center gap-2">
                    <Share2 size={14} />
                    Share
                  </span>
                  {post.share_count > 0 && <span className="text-ink-muted">{post.share_count}</span>}
                </button>

                <button
                  onClick={() => {
                    toggleBookmark.mutate(isBookmarked);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface"
                >
                  <Bookmark size={14} fill={isBookmarked ? "currentColor" : "none"} className={isBookmarked ? "text-accent" : ""} />
                  {isBookmarked ? "Remove from Saved" : "Save"}
                </button>

                {isOwner && (
                  <>
                    <div className="h-px bg-border my-1" />
                    {editable && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          navigate(`/post/${post.id}/edit`);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setArchived.mutate({ postId: post.id, archived: !post.is_archived });
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface"
                    >
                      {post.is_archived ? <RotateCcw size={14} /> : <Archive size={14} />}
                      {post.is_archived ? "Restore" : "Archive"}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-danger hover:bg-surface"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Link to={`/post/${post.id}`} onClick={handleContentTap} className="block mt-3">
        <PostContent heading={post.heading} content={post.content} />
      </Link>

      <PostMedia mediaUrls={post.media_urls} />

      <ReactionTray actions={reactionActions} />

      <Link
        to={`/post/${post.id}`}
        className="flex items-center gap-1.5 text-sm text-ink-muted mt-2"
      >
        <MessageCircle size={16} />
        {post.comment_count > 0 ? `${post.comment_count} comments` : "No comments yet"}
      </Link>
    </article>
  );
                      }
