// src/components/comments/CommentFocal.tsx
import { Link } from "react-router-dom";
import { Avatar } from "../Avatar";
import { renderFormattedText } from "../../lib/formatText";
import { formatCompactCount, formatPostDate, formatPostTime } from "../../lib/formatStats";
import { AnimatedCount } from "../AnimatedCount";
import type { CommentWithAuthor } from "../../hooks/useComments";
import { useCommentViewCount } from "../../hooks/useCommentViews";
import { useCommentEngagement } from "./CommentEngagement";
import { CommentActionBar, CommentMoreMenu } from "./CommentActionBar";

function Stat({ value, singular, plural }: { value: number; singular: string; plural: string }) {
  return (
    <span className="whitespace-nowrap">
      <AnimatedCount value={value} showZero className="font-semibold text-ink" />{" "}
      <span className="text-ink-muted">{value === 1 ? singular : plural}</span>
    </span>
  );
}

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
  const dislikes = Math.max(0, comment.dislike_count + (delta?.dislike ?? 0));

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
        <CommentMoreMenu comment={comment} iconSize={18} />
      </div>

      <p className="text-lg leading-snug text-ink mt-3 whitespace-pre-wrap break-words">
        {renderFormattedText(comment.content, "c")}
      </p>

      <div className="flex items-center flex-wrap gap-x-1.5 text-sm text-ink-muted mt-3 pb-3 border-b border-border">
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

      {(comment.reply_count > 0 || likes > 0 || dislikes > 0) && (
        <div className="flex items-center flex-wrap gap-x-5 gap-y-1 text-sm py-3 border-b border-border">
          {comment.reply_count > 0 && <Stat value={comment.reply_count} singular="Reply" plural="Replies" />}
          {likes > 0 && <Stat value={likes} singular="Like" plural="Likes" />}
          {dislikes > 0 && <Stat value={dislikes} singular="Dislike" plural="Dislikes" />}
        </div>
      )}

      <div className="border-b border-border">
        <CommentActionBar comment={comment} size="lg" />
      </div>
    </article>
  );
}
