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
 * The row under a reply: like · dislike · share · report (or edit / delete on your own) · gift on the far right
 * (others' comments only). There's no "…" menu and no reply button — opening a comment is how you reply (see
 * ReplyBar in CommentDetail). Counts are hidden at zero.
 */
export function CommentActionBar({ comment }: { comment: CommentWithAuthor }) {
  const eng = useCommentEngagement();
  const state = eng.reactions?.get(comment.id);
  const liked = !!state?.liked;
  const disliked = !!state?.disliked;
  const delta = eng.deltas.get(comment.id);
  const likeCount = Math.max(0, comment.like_count + (delta?.like ?? 0));
  const dislikeCount = Math.max(0, comment.dislike_count + (delta?.dislike ?? 0));

  const icon = 17;
  const btn = "flex items-center gap-1.5 p-1.5 transition-colors";
  const quiet = `${btn} text-ink-muted hover:text-ink`;

  const stop = (e: MouseEvent) => e.stopPropagation();
  const isMine = !!eng.currentUserId && comment.author.id === eng.currentUserId;

  return (
    <div className="flex items-center gap-4 -ml-1.5 mt-1" onClick={stop}>
      <button
        onClick={() => eng.toggleReaction({ commentId: comment.id, type: "like", currentlyActive: liked })}
        className={`${btn} ${liked ? "text-danger" : "text-ink-muted hover:text-ink"}`}
        aria-label={liked ? "Unlike" : "Like"}
        aria-pressed={liked}
      >
        <LikeHeart active={liked} size={icon} />
        <AnimatedCount value={likeCount} className="text-xs" />
      </button>

      <button
        onClick={() => eng.toggleReaction({ commentId: comment.id, type: "dislike", currentlyActive: disliked })}
        className={`${btn} ${disliked ? "text-danger" : "text-ink-muted hover:text-ink"}`}
        aria-label={disliked ? "Remove dislike" : "Dislike"}
        aria-pressed={disliked}
      >
        <ThumbsDown size={icon} fill={disliked ? "currentColor" : "none"} />
        <AnimatedCount value={dislikeCount} className="text-xs" />
      </button>

      <button onClick={() => eng.share(comment)} className={quiet} aria-label="Share">
        <Share2 size={icon} />
      </button>

      {isMine ? (
        <>
          {canEditComment(comment) && (
            <button onClick={() => eng.edit(comment)} className={quiet} aria-label="Edit">
              <Pencil size={icon} />
            </button>
          )}
          <button onClick={() => eng.remove(comment)} className={`${btn} text-ink-muted hover:text-danger`} aria-label="Delete">
            <Trash2 size={icon} />
          </button>
        </>
      ) : (
        <>
          <button onClick={() => eng.report(comment)} className={`${btn} text-ink-muted hover:text-danger`} aria-label="Report">
            <Flag size={icon} />
          </button>
          <button onClick={() => eng.gift(comment)} className={`${quiet} ml-auto`} aria-label="Send a gift">
            <GiftIcon size={icon} />
          </button>
        </>
      )}
    </div>
  );
}
