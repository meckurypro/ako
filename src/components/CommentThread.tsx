// src/components/CommentThread.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ThumbsDown } from "lucide-react";
import { Avatar } from "./Avatar";
import { StanceComposer, STANCE_COLORS } from "./StanceComposer";
import {
  useMyCommentReactions,
  useToggleCommentReaction,
  type CommentReactionState,
} from "../hooks/useReactions";
import type { CommentNode } from "../hooks/useComments";
import type { Stance } from "../types/database";
import { renderFormattedText } from "../lib/formatText";

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// Every comment id in the tree, root and replies alike — used to fetch
// the current user's reactions for the whole thread in one request.
// See useMyCommentReactions in hooks/useReactions.ts for why this
// replaced a per-comment query.
function flattenCommentIds(comments: CommentNode[]): string[] {
  const ids: string[] = [];
  const walk = (nodes: CommentNode[]) => {
    for (const node of nodes) {
      ids.push(node.id);
      if (node.replies.length > 0) walk(node.replies);
    }
  };
  walk(comments);
  return ids;
}

type ToggleReaction = (input: {
  commentId: string;
  type: "like" | "dislike";
  currentlyActive: boolean;
}) => void;

interface CommentItemProps {
  comment: CommentNode;
  postId: string;
  depth?: number;
  // Set when arriving via a notification link like
  // /post/{id}#comment-{highlightId} — the matching comment scrolls
  // into view and briefly flashes so it's obvious which one engaged
  // with the person, then fades back to normal.
  highlightId?: string | null;
  // Reaction state and the toggle callback are computed once in
  // CommentThread (one batched query, one shared mutation) and
  // threaded down through props instead of each comment fetching and
  // mutating independently.
  reactions: Map<string, CommentReactionState> | undefined;
  onToggleReaction: ToggleReaction;
}

function CommentItem({
  comment,
  postId,
  depth = 0,
  highlightId,
  reactions,
  onToggleReaction,
}: CommentItemProps) {
  const [replyStance, setReplyStance] = useState<Stance | null>(null);
  const stanceColors = comment.stance ? STANCE_COLORS[comment.stance] : null;
  const ref = useRef<HTMLDivElement>(null);
  const isTarget = !!highlightId && comment.id === highlightId;
  const [flashing, setFlashing] = useState(isTarget);

  const reactionState = reactions?.get(comment.id);
  const isLiked = !!reactionState?.liked;
  const isDisliked = !!reactionState?.disliked;

  useEffect(() => {
    if (!isTarget || !ref.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashing(true);
    const timeout = setTimeout(() => setFlashing(false), 2500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTarget]);

  return (
    <div
      id={`comment-${comment.id}`}
      ref={ref}
      className={`${depth > 0 ? "ml-6 mt-3 border-l border-border pl-4" : "mt-4"} rounded-lg transition-colors duration-700 ${
        flashing ? "bg-highlight -mx-2 px-2 py-1.5" : ""
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Link to={`/profile/${comment.author.username}`}>
          <Avatar
            src={comment.author.avatar_url}
            name={comment.author.display_name}
            size="sm"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/profile/${comment.author.username}`}
              className="text-sm font-medium text-ink hover:underline"
            >
              {comment.author.display_name}
            </Link>
            {stanceColors && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${stanceColors.pillClass}`}
              >
                {stanceColors.label}
              </span>
            )}
            <span className="text-xs text-ink-muted">{timeAgo(comment.created_at)}</span>
          </div>

          <p className="text-sm text-ink mt-1 whitespace-pre-wrap break-words">
            {renderFormattedText(comment.content, "c")}
          </p>

          <div className="flex items-center gap-5 mt-2.5">
            <button
              onClick={() =>
                onToggleReaction({ commentId: comment.id, type: "like", currentlyActive: isLiked })
              }
              className="flex items-center gap-1.5 text-danger -ml-1.5 p-1.5"
            >
              <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
              {comment.like_count > 0 && <span className="text-sm">{comment.like_count}</span>}
            </button>
            <button
              onClick={() =>
                onToggleReaction({
                  commentId: comment.id,
                  type: "dislike",
                  currentlyActive: isDisliked,
                })
              }
              className={`flex items-center gap-1.5 p-1.5 ${isDisliked ? "text-danger" : "text-ink-muted"}`}
            >
              <ThumbsDown size={18} fill={isDisliked ? "currentColor" : "none"} />
              {comment.dislike_count > 0 && <span className="text-sm">{comment.dislike_count}</span>}
            </button>

            {/* Reply stance buttons — each coloured with its own stance colour */}
            {(["support", "disagree", "pushback"] as Stance[]).map((s) => (
              <button
                key={s}
                onClick={() => setReplyStance(s)}
                className={`text-sm font-medium py-1.5 hover:opacity-70 transition-opacity ${STANCE_COLORS[s].iconClass}`}
              >
                {STANCE_COLORS[s].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
              highlightId={highlightId}
              reactions={reactions}
              onToggleReaction={onToggleReaction}
            />
          ))}
        </div>
      )}

      {replyStance && (
        <StanceComposer
          postId={postId}
          stance={replyStance}
          parentCommentId={comment.id}
          onClose={() => setReplyStance(null)}
        />
      )}
    </div>
  );
}

export function CommentThread({
  comments,
  postId,
  highlightId,
}: {
  comments: CommentNode[];
  postId: string;
  highlightId?: string | null;
}) {
  // One request for every reaction the current user has anywhere in
  // this thread, and one shared mutation for toggling any of them —
  // see useReactions.ts for why this replaced a per-comment,
  // per-reaction-type query (the likely cause of like/dislike feeling
  // unreliable on longer threads).
  const commentIds = useMemo(() => flattenCommentIds(comments), [comments]);
  const { data: reactions } = useMyCommentReactions(postId, commentIds);
  const toggleReaction = useToggleCommentReaction(postId);

  if (comments.length === 0) {
    return <p className="text-sm text-ink-muted mt-6 text-center">No responses yet.</p>;
  }

  return (
    <div>
      {toggleReaction.isError && (
        <p className="text-xs text-danger text-center pb-2">
          Couldn't save that reaction — check console for details.
        </p>
      )}
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          postId={postId}
          highlightId={highlightId}
          reactions={reactions}
          onToggleReaction={toggleReaction.mutate}
        />
      ))}
    </div>
  );
}
