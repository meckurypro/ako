// src/components/MessageActionMenu.tsx
import { useLayoutEffect, useRef, useState } from "react";
import { Copy, Trash2, Redo2, MoreHorizontal, Star, Pin, Plus, X, Reply, Forward, EyeOff, CheckSquare } from "lucide-react";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { DropdownMenu, type DropdownMenuItem } from "./DropdownMenu";

interface MessageActionMenuProps {
  messageId: string;
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
   *  strip — parent should open the replace/remove popover anchored at
   *  that button rather than removing immediately. */
  onRequestRemoveReaction: (anchorRect: DOMRect) => void;
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
  /** Fired instead of onClose when the dimmed backdrop tap actually
   *  landed on a different message bubble (identified via
   *  data-message-id on that bubble) — lets the parent hand off into a
   *  multi-select spanning both messages instead of just dismissing
   *  this menu. */
  onTapMessage: (messageId: string) => void;
}

/**
 * Long-press action overlay for a message — highlights the pressed
 * bubble's own space and shows a swipeable emoji-reaction pill
 * anchored just above it, plus a top action bar (WhatsApp's own
 * order: Reply, Forward, Copy, Star, Delete, then a "More" overflow
 * for the rest — Pin, Hide, Select, Share-outside-app).
 * Positioned entirely from `anchorRect`, captured by the caller from
 * the bubble's getBoundingClientRect() at long-press time.
 *
 * Deliberately does NOT dim/blur the rest of the thread the way
 * DropdownMenu/ConfirmDialog/ReactionMoreSheet do — this isn't really
 * a modal blocking the page behind it, it's WhatsApp's selection
 * state: the chat stays fully visible, just non-interactive (the
 * transparent backdrop div below still catches outside taps, it just
 * has no visual treatment of its own), and the pressed message gets a
 * soft highlight panel behind it instead so IT is what reads as
 * "selected," not "everything else is now unavailable."
 *
 * A tombstoned message (isDeleted) has nothing left to copy, react to,
 * reply to, forward, star, pin, or share — the menu collapses down to
 * Select and Delete (which for a tombstone can only mean "delete for
 * me", since there's no content left to delete for everyone).
 */
export function MessageActionMenu({
  messageId,
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
  onTapMessage,
}: MessageActionMenuProps) {
  useBackDismiss(onClose);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  // Measured after mount, then clamped to the viewport — replaces the
  // old fixed "assume it's ~320px wide, anchor to the bubble's left
  // edge" guess, which is what let the pill drift off-center and get
  // its edge truncated depending on the bubble's actual position/the
  // pill's actual (variable) rendered width.
  const [pillPos, setPillPos] = useState<{ top: number; left: number; ready: boolean }>({
    top: 0,
    left: 0,
    ready: false,
  });

  useScrollLock();

  // Reaction pill sits above the bubble; if there isn't room (bubble
  // near the top of the viewport, under the top action bar), it flips
  // to sit below instead. Centered on the bubble's horizontal midpoint
  // — not its left edge — and clamped against the pill's own measured
  // width so it never runs off either side of the screen.
  useLayoutEffect(() => {
    const pill = pillRef.current;
    if (!pill) return;
    const { width, height } = pill.getBoundingClientRect();
    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    const left = Math.min(Math.max(anchorCenterX - width / 2, 8), window.innerWidth - width - 8);
    const pillAbove = anchorRect.top > height + 24;
    const top = pillAbove ? anchorRect.top - height - 8 : anchorRect.bottom + 8;
    setPillPos({ top, left, ready: true });
  }, [anchorRect]);

  function handlePick(emoji: string, e: React.MouseEvent<HTMLButtonElement>) {
    if (myReaction === emoji) {
      onRequestRemoveReaction(e.currentTarget.getBoundingClientRect());
    } else {
      onReact(emoji);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Message actions">
      <div
        className="absolute inset-0"
        onClick={(e) => {
          // A tap that landed on this (invisible) backdrop area — i.e.
          // not on the top bar, reaction pill, or frozen bubble copy,
          // those are separate elements and never bubble a click here
          // — might still be sitting directly over a different message
          // in the real, still-mounted thread underneath. Briefly hide
          // this backdrop from hit-testing to check what's actually
          // there — otherwise elementFromPoint would just find this
          // very div, since it covers the full screen.
          const backdrop = e.currentTarget;
          backdrop.style.pointerEvents = "none";
          const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
          backdrop.style.pointerEvents = "";
          const bubble = el?.closest("[data-message-id]") as HTMLElement | null;
          const tappedId = bubble?.getAttribute("data-message-id");
          if (tappedId && tappedId !== messageId) onTapMessage(tappedId);
          else onClose();
        }}
      />

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
          <button ref={moreButtonRef} onClick={() => setMoreOpen((v) => !v)} className="p-2 text-ink" aria-label="More options">
            <MoreHorizontal size={19} />
          </button>
          {moreOpen && (
            <DropdownMenu
              anchorRef={moreButtonRef}
              onClose={() => setMoreOpen(false)}
              widthClass="w-52"
              items={(() => {
                const menuItems: (DropdownMenuItem | "divider")[] = [
                  {
                    key: "select",
                    label: "Select",
                    icon: <CheckSquare />,
                    onSelect: () => {
                      onSelect();
                      onClose();
                    },
                  },
                ];
                if (!isDeleted) {
                  menuItems.push(
                    {
                      key: "pin",
                      label: isPinned ? "Unpin" : "Pin",
                      icon: <Pin className={isPinned ? "fill-accent text-accent" : ""} />,
                      onSelect: () => {
                        onTogglePin();
                        onClose();
                      },
                    },
                    {
                      key: "hide",
                      label: "Hide for me",
                      icon: <EyeOff />,
                      onSelect: () => {
                        onHide();
                        onClose();
                      },
                    },
                    {
                      key: "share",
                      label: "Share outside app",
                      icon: <Redo2 />,
                      onSelect: () => {
                        onShare();
                        onClose();
                      },
                    }
                  );
                }
                return menuItems;
              })()}
            />
          )}
        </div>
      </div>

      {/* Reaction pill — 12 emojis in one scrollable strip; no per-button
          background so the emoji itself reads bigger/cleaner. A ring
          (not a fill) marks the user's own current reaction. */}
      {!isDeleted && (
        <div
          ref={pillRef}
          className="absolute flex items-center gap-1.5 bg-surface border border-border rounded-full px-2.5 py-2 shadow-lg overflow-x-auto no-scrollbar snap-x snap-mandatory max-w-[92vw] transition-opacity duration-100"
          style={{ top: pillPos.top, left: pillPos.left, opacity: pillPos.ready ? 1 : 0 }}
        >
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={(e) => handlePick(emoji, e)}
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

      {/* Highlight for the selected message's own space — this, not a
          dimmed backdrop, is what marks it as "selected" (see the
          component doc comment above for why). Deliberately a plain
          rect wider/taller than the bubble by a fixed margin rather
          than matched to bubble's own border-radius — reads as a
          selection highlight sitting behind the message, not as a
          second bubble. */}
      <div
        className="absolute rounded-xl bg-accent-soft/60 pointer-events-none"
        style={{
          top: anchorRect.top - 6,
          left: anchorRect.left - 6,
          width: anchorRect.width + 12,
          height: anchorRect.height + 12,
        }}
      />

      {/* Frozen copy of the bubble, sitting on the highlight above */}
      <div
        className="absolute pointer-events-none select-none"
        style={{ top: anchorRect.top, left: anchorRect.left, width: anchorRect.width }}
      >
        <div
          className={`relative rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
            isMine ? "bg-accent text-white bubble-tail-mine" : "bg-surface text-ink bubble-tail-theirs"
          } ${isDeleted ? "italic opacity-70" : ""}`}
        >
          {isDeleted ? "This message was deleted" : content}
        </div>
      </div>
    </div>
  );
}
