// src/components/ReactionOptionsPopover.tsx
import { useLayoutEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { Portal } from "./Portal";

export interface ReactionPopoverTarget {
  messageId: string;
  /** Where the tapped reaction badge was, so this can anchor right next to it. */
  anchorRect: DOMRect;
  /** The user's own current reaction on that message — what tapping "quick swap" replaces. */
  emoji: string;
}

interface ReactionOptionsPopoverProps {
  target: ReactionPopoverTarget;
  /** A handful of quick emoji to swap to directly, without opening the full picker. */
  quickEmojis: string[];
  onReplace: (emoji: string) => void;
  onOpenFullPicker: () => void;
  onRemove: () => void;
  onClose: () => void;
}

/**
 * Tapping your own reaction again used to open a full-screen
 * ConfirmDialog just to ask "remove your reaction?" — big, modal, and
 * (bug) it never actually closed itself after the removal went
 * through, leaving a stray "are you sure" prompt with nothing left to
 * confirm. This replaces that with a small anchored card, the same
 * weight as the emoji reaction pill it's managing: a short strip of
 * quick swap options plus a remove row. Every action closes the
 * popover itself — there's nothing left to wait around for.
 *
 * Only one reaction per message per person, always — tapping your own
 * current emoji in the strip below removes it (same destination as
 * the explicit row underneath), tapping any other emoji replaces it.
 * There's no "add a second reaction" path anywhere in this component.
 */
export function ReactionOptionsPopover({
  target,
  quickEmojis,
  onReplace,
  onOpenFullPicker,
  onRemove,
  onClose,
}: ReactionOptionsPopoverProps) {
  useBackDismiss(onClose);
  const cardRef = useRef<HTMLDivElement>(null);
  // Measured after mount so this can be centered on the badge precisely
  // and clamped to the viewport — a fixed guessed width is what made
  // the old quick-react pill misalign/truncate near screen edges (see
  // MessageActionMenu's pill, fixed the same way).
  const [style, setStyle] = useState<{ top: number; left: number; opacity: number }>({
    top: target.anchorRect.top,
    left: target.anchorRect.left,
    opacity: 0,
  });

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const { width, height } = card.getBoundingClientRect();
    const anchorCenterX = target.anchorRect.left + target.anchorRect.width / 2;
    const left = Math.min(Math.max(anchorCenterX - width / 2, 8), window.innerWidth - width - 8);
    const spaceAbove = target.anchorRect.top;
    const top =
      spaceAbove > height + 16 ? target.anchorRect.top - height - 8 : target.anchorRect.bottom + 8;
    setStyle({ top, left, opacity: 1 });
  }, [target]);

  const otherQuickEmojis = quickEmojis.filter((e) => e !== target.emoji).slice(0, 5);

  return (
    <Portal>
      <div className="fixed inset-0 z-50" role="dialog" aria-label="Manage reaction">
        <div className="absolute inset-0" onClick={onClose} />
        <div
          ref={cardRef}
          className="absolute bg-surface border border-border rounded-2xl shadow-lg py-2 w-max max-w-[88vw] transition-opacity duration-100"
          style={{ top: style.top, left: style.left, opacity: style.opacity }}
        >
          <div className="flex items-center gap-1 px-2 pb-2 border-b border-border">
            {[target.emoji, ...otherQuickEmojis].map((emoji, i) => (
              <button
                key={emoji}
                onClick={() => {
                  // Tapping your own already-active reaction removes
                  // it — a second tap on the same emoji was previously
                  // a no-op here, leaving removal reachable only via
                  // the explicit row below. Tapping any other emoji
                  // still replaces, same as before; only one reaction
                  // is ever active at a time either way.
                  if (i === 0) {
                    onRemove();
                  } else {
                    onReplace(emoji);
                  }
                  onClose();
                }}
                className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-xl leading-none transition-transform active:scale-90 ${
                  i === 0 ? "ring-2 ring-accent" : ""
                }`}
                aria-label={i === 0 ? `Remove your reaction ${emoji}` : `React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => {
                onOpenFullPicker();
                onClose();
              }}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-ink-muted text-lg"
              aria-label="More emoji"
            >
              +
            </button>
          </div>
          <button
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="flex items-center gap-2 w-full px-4 pt-2 text-sm text-danger text-left"
          >
            <Trash2 size={15} />
            Tap to replace or remove
          </button>
        </div>
      </div>
    </Portal>
  );
}
