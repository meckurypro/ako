import { Link } from "react-router-dom";
import { MessageCircle, Bookmark } from "lucide-react";
import { Avatar } from "./Avatar";
import { TierBadge } from "./TierBadge";
import { ReactionTray } from "./ReactionTray";
import { useIsBookmarked, useToggleBookmark } from "../hooks/useBookmarks";
import { isVideoUrl } from "../hooks/useUploadPostMedia";
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

export function PostCard({ post }: { post: PostWithAuthor }) {
  const isBookmarkedQuery = useIsBookmarked(post.id);
  const toggleBookmark = useToggleBookmark(post.id);
  const isBookmarked = !!isBookmarkedQuery.data;

  return (
    <article className="bg-surface rounded-2xl p-4 mb-3">
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
          <p className="text-xs text-ink-muted">{timeAgo(post.created_at)}</p>
        </div>
      </div>

      <Link to={`/post/${post.id}`}>
        <p className="text-ink mt-3 whitespace-pre-wrap break-words">{post.content}</p>
      </Link>

      {post.media_urls.length > 0 && (
        <div
          className={`mt-3 rounded-xl overflow-hidden grid gap-1 ${
            post.media_urls.length > 1 ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {post.media_urls.map((url) =>
            isVideoUrl(url) ? (
              <video key={url} src={url} controls className="w-full object-cover max-h-96" />
            ) : (
              <img key={url} src={url} alt="" className="w-full object-cover max-h-96" />
            )
          )}
        </div>
      )}

      <ReactionTray post={post} />

      <div className="flex items-center justify-between mt-2">
        <Link to={`/post/${post.id}`} className="flex items-center gap-1.5 text-sm text-ink-muted">
          <MessageCircle size={16} />
          {post.comment_count > 0 ? `${post.comment_count} comments` : "Comment"}
        </Link>

        <button
          onClick={() => toggleBookmark.mutate(isBookmarked)}
          className={isBookmarked ? "text-accent" : "text-ink-muted"}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
        >
          <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} />
        </button>
      </div>
    </article>
  );
}
