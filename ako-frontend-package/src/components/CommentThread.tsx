import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ThumbsDown } from "lucide-react";
import { Avatar } from "./Avatar";
import { StanceComposer } from "./StanceComposer";
import { useMyReaction, useToggleReaction } from "../hooks/useReactions";
import type { CommentNode } from "../hooks/useComments";
import type { Stance } from "../types/database";

const STANCE_STYLES: Record<Stance, { label: string; className: string }> = {
  support: { label: "Support", className: "text-accent bg-accent-soft" },
  disagree: { label: "Disagree", className: "text-danger bg-danger/10" },
  pushback: { label: "Pushback", className: "text-ink bg-surface" },
};

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

interface CommentItemProps {
  comment: CommentNode;
  postId: string;
  depth?: number;
}

function CommentItem({ comment, postId, depth = 0 }: CommentItemProps) {
  const [replyStance, setReplyStance] = useState<Stance | null>(null);
  const stanceStyle = comment.stance ? STANCE_STYLES[comment.stance] : null;

  const likeQuery = useMyReaction(comment.id, "comment", "like");
  const dislikeQuery = useMyReaction(comment.id, "comment", "dislike");
  const toggleLike = useToggleReaction(comment.id, "comment", "like");
  const toggleDislike = useToggleReaction(comment.id, "comment", "dislike");
  const isLiked = !!likeQuery.data;
  const isDisliked = !!dislikeQuery.data;

  return (
    <div className={depth > 0 ? "ml-6 mt-3 border-l border-border pl-4" : "mt-4"}>
      <div className="flex items-start gap-2.5">
        <Link to={`/profile/${comment.author.username}`}>
          <Avatar src={comment.author.avatar_url} name={comment.author.display_name} size="sm" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/profile/${comment.author.username}`}
              className="text-sm font-medium text-ink hover:underline"
            >
              {comment.author.display_name}
            </Link>
            {stanceStyle && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stanceStyle.className}`}>
                {stanceStyle.label}
              </span>
            )}
            <span className="text-xs text-ink-muted">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm text-ink mt-1 whitespace-pre-wrap break-words">{comment.content}</p>

          <div className="flex items-center gap-3 mt-1.5">
            <button
              onClick={() => toggleLike.mutate(isLiked)}
              className={`flex items-center gap-1 text-xs ${isLiked ? "text-accent" : "text-ink-muted"}`}
            >
              <Heart size={13} fill={isLiked ? "currentColor" : "none"} />
              {comment.like_count > 0 && comment.like_count}
            </button>
            <button
              onClick={() => toggleDislike.mutate(isDisliked)}
              className={`flex items-center gap-1 text-xs ${isDisliked ? "text-danger" : "text-ink-muted"}`}
            >
              <ThumbsDown size={13} fill={isDisliked ? "currentColor" : "none"} />
              {comment.dislike_count > 0 && comment.dislike_count}
            </button>
            {(["support", "disagree", "pushback"] as Stance[]).map((s) => (
              <button
                key={s}
                onClick={() => setReplyStance(s)}
                className="text-xs text-ink-muted hover:text-accent"
              >
                {STANCE_STYLES[s].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} postId={postId} depth={depth + 1} />
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

export function CommentThread({ comments, postId }: { comments: CommentNode[]; postId: string }) {
  if (comments.length === 0) {
    return <p className="text-sm text-ink-muted mt-6 text-center">No responses yet.</p>;
  }

  return (
    <div>
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} postId={postId} />
      ))}
    </div>
  );
}
