// src/components/MessageActionMenu.tsx
import { useEffect, useState } from "react";
import { Copy, Trash2, Redo2, MoreHorizontal, Star, Pin, Plus, X, Reply, Forward, EyeOff, CheckSquare } from "lucide-react";
import { useBackDismiss } from "../hooks/useBackDismiss";

interface MessageActionMenuProps {
  content: string;
  isMine: boolean;
  /** Tombstoned ("deleted for everyone") — collapses the menu down to just Select and Delete-for-me. */
  isDeleted: boolean;
  anchorRect: DOMRect;
  isStarred: boolean;
  isPinned: boolean;
  emojis: string[]; // the 12-emoji reaction pill, in order
  myReaction: string | null;
  onReact: (emoji: string) => void;
  /** The user tapped their OWN already-active emoji again in the quick-react
   *  strip — parent should confirm before actually removing it. */
  onRequestRemoveReaction: () => void;
  onOpenFullPicker: () => void;
  onCopy: () => void;
  /** Opens DeleteMessageSheet in the caller — this menu never deletes directly, since the scope (me/everyone) still needs picking. */
  onDeletePress: () => void;
  onForward: () => void;
  onReply: () => void;
  onToggleStar: () => void;
  onTogglePin: () => void;
  onHide: () => void;
  onShare: () => void;
  onSelect: () => void;
  onClose: () => void;
}

/**
 * Long-press action overlay for a message — dims the rest of the
 * screen, shows a swipeable emoji-reaction pill anchored just above
 * the pressed bubble, and a top action bar (WhatsApp's own order:
 * Reply, Forward, Copy, Star, Delete, then a "More" overflow for the
 * rest — Pin, Hide, Select, Share-outside-app).
 * Positioned entirely from `anchorRect`, captured by the caller from
 * the bubble's getBoundingClientRect() at long-press time.
 *
 * A tombstoned message (isDeleted) has nothing left to copy, react to,
 * reply to, forward, star, pin, or share — the menu collapses down to
 * Select and Delete (which for a tombstone can only mean "delete for
 * me", since there's no content left to delete for everyone).
 */
export function MessageActionMenu({
  content,
  isMine,
  isDeleted,
  anchorRect,
  isStarred,
  isPinned,
  emojis,
  myReaction,
  onReact,
  onRequestRemoveReaction,
  onOpenFullPicker,
  onCopy,
  onDeletePress,
  onForward,
  onReply,
  onToggleStar,
  onTogglePin,
  onHide,
  onShare,
  onSelect,
  onClose,
}: MessageActionMenuProps) {
  useBackDismiss(onClose);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Reaction pill sits above the bubble; if there isn't room (bubble
  // near the top of the viewport, under the top action bar), it flips
  // to sit below instead.
  const pillAbove = anchorRect.top > 140;
  const pillTop = pillAbove ? anchorRect.top - 60 : anchorRect.bottom + 8;
  const pillLeft = Math.min(Math.max(anchorRect.left, 8), window.innerWidth - 320);

  function handlePick(emoji: string) {
    if (myReaction === emoji) {
      onRequestRemoveReaction();
    } else {
      onReact(emoji);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Message actions">
      <div className="absolute inset-0 bg-canvas/70 backdrop-blur-sm" onClick={onClose} />

      {/* Top action bar — WhatsApp order: close, then (in priority order)
          Reply, Forward, Copy, Star, Delete, More. */}
      <div className="absolute top-0 left-0 right-0 bg-surface border-b border-border px-2 py-3 flex items-center gap-1">
        <button onClick={onClose} className="p-2 text-ink-muted" aria-label="Close">
          <X size={20} />
        </button>
        <div className="flex-1" />

        {!isDeleted && (
          <>
            <button
              onClick={() => {
                onReply();
                onClose();
              }}
              className="p-2 text-ink"
              aria-label="Reply"
            >
              <Reply size={19} />
            </button>
            <button
              onClick={() => {
                onForward();
                onClose();
              }}
              className="p-2 text-ink"
              aria-label="Forward"
            >
              <Forward size={19} />
            </button>
            <button
              onClick={() => {
                onCopy();
                onClose();
              }}
              className="p-2 text-ink"
              aria-label="Copy"
            >
              <Copy size={19} />
            </button>
            <button
              onClick={() => {
                onToggleStar();
                onClose();
              }}
              className="p-2 text-ink"
              aria-label={isStarred ? "Unstar" : "Star"}
            >
              <Star size={19} className={isStarred ? "fill-accent text-accent" : ""} />
            </button>
          </>
        )}

        {(isMine || isDeleted) && (
          <button
            onClick={() => {
              onDeletePress();
              onClose();
            }}
            className="p-2 text-danger"
            aria-label="Delete"
          >
            <Trash2 size={19} />
          </button>
        )}

        <div className="relative">
          <button onClick={() => setMoreOpen((v) => !v)} className="p-2 text-ink" aria-label="More options">
            <MoreHorizontal size={19} />
          </button>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
              <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-lg py-1 w-44 z-20">
                <button
                  onClick={() => {
                    onSelect();
                    onClose();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink hover:bg-accent-soft"
                >
                  <CheckSquare size={16} />
                  Select
                </button>
                {!isDeleted && (
                  <>
                    <button
                      onClick={() => {
                        onTogglePin();
                        onClose();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink hover:bg-accent-soft"
                    >
                      <Pin size={16} className={isPinned ? "fill-accent text-accent" : ""} />
                      {isPinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      onClick={() => {
                        onHide();
                        onClose();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink hover:bg-accent-soft"
                    >
                      <EyeOff size={16} />
                      Hide for me
                    </button>
                    <button
                      onClick={() => {
                        onShare();
                        onClose();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink hover:bg-accent-soft"
                    >
                      <Redo2 size={16} />
                      Share outside app
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reaction pill — 12 emojis in one scrollable strip; no per-button
          background so the emoji itself reads bigger/cleaner. A ring
          (not a fill) marks the user's own current reaction. */}
      {!isDeleted && (
        <div
          className="absolute flex items-center gap-1.5 bg-surface border border-border rounded-full px-2.5 py-2 shadow-lg overflow-x-auto no-scrollbar snap-x snap-mandatory max-w-[92vw]"
          style={{ top: pillTop, left: pillLeft }}
        >
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handlePick(emoji)}
              className={`snap-start flex-shrink-0 text-3xl leading-none w-10 h-10 flex items-center justify-center rounded-full transition-transform active:scale-90 ${
                myReaction === emoji ? "ring-2 ring-accent" : ""
              }`}
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => {
              onOpenFullPicker();
              onClose();
            }}
            className="snap-start flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-ink-muted border border-border"
            aria-label="More emoji"
          >
            <Plus size={16} />
          </button>
        </div>
      )}

      {/* Frozen copy of the bubble, highlighted above the dimmed backdrop */}
      <div
        className="absolute pointer-events-none select-none"
        style={{ top: anchorRect.top, left: anchorRect.left, width: anchorRect.width }}
      >
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
            isMine ? "bg-accent text-white" : "bg-surface text-ink"
          } ${isDeleted ? "italic opacity-70" : ""}`}
        >
          {isDeleted ? "This message was deleted" : content}
        </div>
      </div>
    </div>
  );
}
