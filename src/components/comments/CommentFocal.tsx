// src/components/comments/CommentFocal.tsx
import { Link } from "react-router-dom";
import { LikeHeart } from "../LikeHeart";
import { Avatar } from "../Avatar";
import { renderFormattedText } from "../../lib/formatText";
import { formatCompactCount, formatPostDate, formatPostTime } from "../../lib/formatStats";
import { AnimatedCount } from "../AnimatedCount";
import type { CommentWithAuthor } from "../../hooks/useComments";
import { useCommentViewCount } from "../../hooks/useCommentViews";
import { useCommentEngagement } from "./CommentEngagement";
import { CommentMoreMenu } from "./CommentActionBar";

/**
 * A comment opened as the parent of its own thread — laid out like a post's expanded view (big text,
 * time · date · views, counts, spaced actions) and deliberately NOT stance-tinted: here it's the subject, and
 * it's the replies beneath that carry colour.
 */
export function CommentFocal({ comment }: { comment: CommentWithAuthor }) {
  const eng = useCommentEngagement();
  const views = useCommentViewCount(comment.id).data ?? 0;
  const delta = eng.deltas.get(comment.id);
  const likes = Math.max(0, comment.like_count + (delta?.like ?? 0));
  const state = eng.reactions?.get(comment.id);
  const liked = !!state?.liked;

  return (
    <article className="pt-4">
      <div className="flex items-center gap-3">
        <Link to={`/profile/${comment.author.username}`} className="flex-shrink-0">
          <Avatar src={comment.author.avatar_url} name={comment.author.display_name} size="md" />
        </Link>
        <Link to={`/profile/${comment.author.username}`} className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-ink truncate hover:underline">{comment.author.display_name}</p>
          <p className="text-sm text-ink-muted truncate">@{comment.author.username}</p>
        </Link>
      </div>

      <p className="text-lg leading-snug text-ink mt-3 whitespace-pre-wrap break-words">
        {renderFormattedText(comment.content, "c")}
      </p>

      {/* One stats row, always on a single line: time · date · views on the left; comment count, heart and the "…" on the
          right. The heart is the like control itself, so nothing repeats underneath. */}
      <div className="flex items-center justify-between pb-1 mt-3 border-b border-border text-sm">
        <div className="flex items-center gap-x-1.5 py-1.5 text-ink-muted whitespace-nowrap shrink-0">
          <span>{formatPostTime(comment.created_at)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatPostDate(comment.created_at)}</span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-ink">{formatCompactCount(views)}</span>
          <span>{views === 1 ? "View" : "Views"}</span>
          {comment.edited_at && (
            <>
              <span aria-hidden="true">·</span>
              <span>Edited</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-x-3 shrink-0 whitespace-nowrap">
          <span className="flex items-center gap-1.5 py-1.5 text-ink-muted">
            <AnimatedCount value={comment.reply_count} showZero className="font-semibold text-ink" />
            <span>{comment.reply_count === 1 ? "Comment" : "Comments"}</span>
          </span>
          <button
            onClick={() => eng.toggleReaction({ commentId: comment.id, type: "like", currentlyActive: liked })}
            className={`flex items-center gap-1.5 py-1.5 transition-colors ${liked ? "text-danger" : "text-ink-muted hover:text-ink"}`}
            aria-label={liked ? "Unlike" : "Like"}
            aria-pressed={liked}
          >
            <LikeHeart active={liked} size={16} />
            <AnimatedCount value={likes} showZero className={`font-semibold ${liked ? "text-danger" : "text-ink"}`} />
          </button>
          <CommentMoreMenu comment={comment} iconSize={18} />
        </div>
      </div>
    </article>
  );
}
