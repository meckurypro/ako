// src/components/comments/CommentActionBar.tsx
import { useRef, useState, type MouseEvent } from "react";
import { Flag, Gift as GiftIcon, MoreHorizontal, Pencil, Share2, ThumbsDown, Trash2 } from "lucide-react";
import { LikeHeart } from "../LikeHeart";
import { DropdownMenu, type DropdownMenuItem } from "../DropdownMenu";
import { AnimatedCount } from "../AnimatedCount";
import { canEditComment, type CommentWithAuthor } from "../../hooks/useComments";
import { useCommentEngagement } from "./CommentEngagement";

/** "…" menu for one comment: share; for your own — edit (until anyone engages) and delete; for others' — report. */
export function CommentMoreMenu({ comment, iconSize = 16 }: { comment: CommentWithAuthor; iconSize?: number }) {
  const eng = useCommentEngagement();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isMine = !!eng.currentUserId && comment.author.id === eng.currentUserId;

  const items: DropdownMenuItem[] = [
    { key: "share", label: "Share", icon: <Share2 />, onSelect: () => eng.share(comment) },
    ...(isMine
      ? [
          // Editable only until anyone engages; deletable any time.
          ...(canEditComment(comment)
            ? [{ key: "edit", label: "Edit", icon: <Pencil />, onSelect: () => eng.edit(comment) }]
            : []),
          { key: "delete", label: "Delete", icon: <Trash2 />, variant: "danger" as const, onSelect: () => eng.remove(comment) },
        ]
      : [
          { key: "report", label: "Report", icon: <Flag />, variant: "danger" as const, onSelect: () => eng.report(comment) },
        ]),
  ];

  return (
    // Stop clicks here (and in the menu portaled out of it, which still bubbles through React) from also
    // counting as a tap on the row underneath.
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-1.5 -m-1.5 text-ink-muted hover:text-ink transition-colors"
        aria-label="Comment options"
      >
        <MoreHorizontal size={iconSize} />
      </button>
      {open && <DropdownMenu title="Comment options" anchorRef={buttonRef} onClose={() => setOpen(false)} items={items} />}
    </div>
  );
}

/**
 * Like · dislike · gift for one comment (counts hidden at zero), gift on the right and only on others' comments.
 * There's no reply button: opening a comment is how you reply (see ReplyBar in CommentDetail). `sm` is the
 * compact row under a reply; `lg` is the spaced-out bar under an opened comment.
 */
export function CommentActionBar({ comment, size = "sm" }: { comment: CommentWithAuthor; size?: "sm" | "lg" }) {
  const eng = useCommentEngagement();
  const state = eng.reactions?.get(comment.id);
  const liked = !!state?.liked;
  const disliked = !!state?.disliked;
  const delta = eng.deltas.get(comment.id);
  const likeCount = Math.max(0, comment.like_count + (delta?.like ?? 0));
  const dislikeCount = Math.max(0, comment.dislike_count + (delta?.dislike ?? 0));

  const icon = size === "lg" ? 22 : 17;
  const countClass = size === "lg" ? "text-sm" : "text-xs";
  const wrapperClass = size === "lg" ? "flex items-center justify-around py-1" : "flex items-center gap-7 -ml-1.5 mt-1";
  const btn = "flex items-center gap-1.5 p-1.5 transition-colors";

  const stop = (e: MouseEvent) => e.stopPropagation();
  const isMine = !!eng.currentUserId && comment.author.id === eng.currentUserId;

  return (
    <div className={wrapperClass} onClick={stop}>
      <button
        onClick={() => eng.toggleReaction({ commentId: comment.id, type: "like", currentlyActive: liked })}
        className={`${btn} ${liked ? "text-danger" : "text-ink-muted hover:text-ink"}`}
        aria-label={liked ? "Unlike" : "Like"}
        aria-pressed={liked}
      >
        <LikeHeart active={liked} size={icon} />
        <AnimatedCount value={likeCount} className={countClass} />
      </button>

      <button
        onClick={() => eng.toggleReaction({ commentId: comment.id, type: "dislike", currentlyActive: disliked })}
        className={`${btn} ${disliked ? "text-danger" : "text-ink-muted hover:text-ink"}`}
        aria-label={disliked ? "Remove dislike" : "Dislike"}
        aria-pressed={disliked}
      >
        <ThumbsDown size={icon} fill={disliked ? "currentColor" : "none"} />
        <AnimatedCount value={dislikeCount} className={countClass} />
      </button>

      {size === "lg" && (
        <button onClick={() => eng.share(comment)} className={`${btn} text-ink-muted hover:text-ink`} aria-label="Share">
          <Share2 size={icon} />
        </button>
      )}

      {!isMine && (
        <button
          onClick={() => eng.gift(comment)}
          className={`${btn} text-ink-muted hover:text-ink ${size === "sm" ? "ml-auto" : ""}`}
          aria-label="Send a gift"
        >
          <GiftIcon size={icon} />
        </button>
      )}
    </div>
  );
}
