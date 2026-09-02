// src/components/MessageActionMenu.tsx
import { useEffect, useState } from "react";
import { Copy, Trash2, Share2, MoreHorizontal, Star, Pin, Plus, X, Reply } from "lucide-react";

interface MessageActionMenuProps {
  content: string;
  isMine: boolean;
  anchorRect: DOMRect;
  isStarred: boolean;
  isPinned: boolean;
  emojis: string[]; // the 12-emoji reaction pill, in order
  myReaction: string | null;
  onReact: (emoji: string) => void;
  onRemoveReaction: () => void;
  onOpenFullPicker: () => void;
  onCopy: () => void;
  onDelete?: () => void;
  onShare: () => void;
  onReply: () => void;
  onToggleStar: () => void;
  onTogglePin: () => void;
  onClose: () => void;
}

/**
 * Long-press action overlay for a message — dims the rest of the
 * screen, shows a swipeable emoji-reaction pill anchored just above
 * the pressed bubble, and a top action bar (copy/delete/share + more).
 * Positioned entirely from `anchorRect`, captured by the caller from
 * the bubble's getBoundingClientRect() at long-press time.
 */
export function MessageActionMenu({
  content,
  isMine,
  anchorRect,
  isStarred,
  isPinned,
  emojis,
  myReaction,
  onReact,
  onRemoveReaction,
  onOpenFullPicker,
  onCopy,
  onDelete,
  onShare,
  onReply,
  onToggleStar,
  onTogglePin,
  onClose,
}: MessageActionMenuProps) {
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
  const pillTop = pillAbove ? anchorRect.top - 56 : anchorRect.bottom + 8;
  const pillLeft = Math.min(Math.max(anchorRect.left, 8), window.innerWidth - 300);

  function handlePick(emoji: string) {
    if (myReaction === emoji) {
      onRemoveReaction();
    } else {
      onReact(emoji);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Message actions">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />

      {/* Top action bar */}
      <div className="absolute top-0 left-0 right-0 bg-surface border-b border-border px-2 py-3 flex items-center gap-1">
        <button onClick={onClose} className="p-2 text-ink-muted" aria-label="Close">
          <X size={20} />
        </button>
        <div className="flex-1" />
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
            onShare();
            onClose();
          }}
          className="p-2 text-ink"
          aria-label="Share"
        >
          <Share2 size={19} />
        </button>
        {isMine && onDelete && (
          <button
            onClick={() => {
              onDelete();
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
            <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-lg py-1 w-40 z-10">
              <button
                onClick={() => {
                  onToggleStar();
                  onClose();
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink hover:bg-accent-soft"
              >
                <Star size={16} className={isStarred ? "fill-accent text-accent" : ""} />
                {isStarred ? "Unstar" : "Star"}
              </button>
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
            </div>
          )}
        </div>
      </div>

      {/* Reaction pill — 12 emojis in one scrollable strip; ~7 fit in
          view at a time, swiping reveals the rest. */}
      <div
        className="absolute flex items-center gap-1 bg-surface border border-border rounded-full px-2 py-1.5 shadow-lg overflow-x-auto no-scrollbar snap-x snap-mandatory max-w-[92vw]"
        style={{ top: pillTop, left: pillLeft }}
      >
        {emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handlePick(emoji)}
            className={`snap-start flex-shrink-0 text-xl w-9 h-9 flex items-center justify-center rounded-full transition-transform active:scale-90 ${
              myReaction === emoji ? "bg-accent-soft" : ""
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

      {/* Frozen copy of the bubble, highlighted above the dimmed backdrop */}
      <div
        className="absolute pointer-events-none select-none"
        style={{ top: anchorRect.top, left: anchorRect.left, width: anchorRect.width }}
      >
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
            isMine ? "bg-accent text-canvas" : "bg-surface text-ink"
          }`}
        >
          {content}
        </div>
      </div>
    </div>
  );
}
