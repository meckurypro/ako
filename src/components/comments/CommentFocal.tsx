// src/components/comments/CommentFocal.tsx
import { Link } from "react-router-dom";
import { Gift as GiftIcon, Share2, ThumbsDown } from "lucide-react";
import { LikeHeart } from "../LikeHeart";
import { Avatar } from "../Avatar";
import { renderFormattedText } from "../../lib/formatText";
import { formatCompactCount, formatPostDate, formatPostTime } from "../../lib/formatStats";
import { AnimatedCount } from "../AnimatedCount";
import type { CommentWithAuthor } from "../../hooks/useComments";
import { useCommentViewCount } from "../../hooks/useCommentViews";
import { useCommentEngagement } from "./CommentEngagement";
import { CommentMoreMenu } from "./CommentActionBar";

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
  const shares = comment.share_count ?? 0;
  const state = eng.reactions?.get(comment.id);
  const liked = !!state?.liked;
  const disliked = !!state?.disliked;
  const isMine = !!eng.currentUserId && comment.author.id === eng.currentUserId;

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

      {/* One row does double duty: the live counts AND the controls, all at the stats' own size. */}
      <div className="flex items-center flex-wrap gap-x-5 gap-y-1 text-sm py-1.5 border-b border-border">
        {comment.reply_count > 0 && (
          <span className="py-1.5">
            <Stat value={comment.reply_count} singular="Reply" plural="Replies" />
          </span>
        )}
        <button
          onClick={() => eng.toggleReaction({ commentId: comment.id, type: "like", currentlyActive: liked })}
          className={`flex items-center gap-1.5 py-1.5 transition-colors ${liked ? "text-danger" : "text-ink-muted hover:text-ink"}`}
          aria-label={liked ? "Unlike" : "Like"}
          aria-pressed={liked}
        >
          <LikeHeart active={liked} size={16} />
          <AnimatedCount value={likes} showZero className={`font-semibold ${liked ? "text-danger" : "text-ink"}`} />
        </button>
        <button
          onClick={() => eng.toggleReaction({ commentId: comment.id, type: "dislike", currentlyActive: disliked })}
          className={`flex items-center gap-1.5 py-1.5 transition-colors ${disliked ? "text-danger" : "text-ink-muted hover:text-ink"}`}
          aria-label={disliked ? "Remove dislike" : "Dislike"}
          aria-pressed={disliked}
        >
          <ThumbsDown size={16} fill={disliked ? "currentColor" : "none"} />
          <AnimatedCount value={dislikes} showZero className={`font-semibold ${disliked ? "text-danger" : "text-ink"}`} />
        </button>
        <button
          onClick={() => eng.share(comment)}
          className="flex items-center gap-1.5 py-1.5 text-ink-muted hover:text-ink transition-colors"
          aria-label="Share"
        >
          <Share2 size={16} />
          <AnimatedCount value={shares} showZero className="font-semibold text-ink" />
        </button>
        {!isMine && (
          <button
            onClick={() => eng.gift(comment)}
            className="flex items-center py-1.5 text-ink-muted hover:text-ink transition-colors"
            aria-label="Send a gift"
          >
            <GiftIcon size={16} />
          </button>
        )}
      </div>
    </article>
  );
}
