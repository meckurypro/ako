// src/components/PostCard.tsx
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MessageCircle,
  MoreVertical,
  Heart,
  ThumbsDown,
  Share2,
  Bookmark,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
} from "lucide-react";
import { Avatar } from "./Avatar";
import { TierBadge } from "./TierBadge";
import { ReactionTray } from "./ReactionTray";
import { PostMedia } from "./PostMedia";
import { PostContent } from "./PostContent";
import { useAuth } from "../hooks/useAuth";
import { useIsBookmarked, useToggleBookmark } from "../hooks/useBookmarks";
import { useMyReaction, useToggleReaction } from "../hooks/useReactions";
import { canEditPost, useDeletePost, useSetPostArchived } from "../hooks/usePosts";
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

  return (
    <article className="bg-surface rounded-2xl p-4 mb-3 relative">
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
              {post.author.display_name}
            </Link>
            <TierBadge tier={post.author.tier} />
          </div>
          <p className="text-xs text-ink-muted">
            {timeAgo(post.created_at)}
            {post.edited_at && " · edited"}
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="text-ink-muted p-1"
            aria-label="Post options"
          >
            <MoreVertical size={18} />
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

      <ReactionTray post={post} />

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
