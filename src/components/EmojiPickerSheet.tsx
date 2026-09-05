// src/components/EmojiPickerSheet.tsx
import { X, Delete } from "lucide-react";
import { EMOJI_CATEGORIES } from "../lib/emojiData";
import { useRecentEmojis } from "../hooks/useMessageReactions";
import { useBackDismiss } from "../hooks/useBackDismiss";

interface EmojiPickerSheetProps {
  onSelect: (emoji: string) => void;
  /** Only used by "reaction" mode, which is a real modal with its own
   *  close button. "input" mode closes via the compose bar's own
   *  keyboard-toggle button, not from inside this component. */
  onClose?: () => void;
  /** "input": renders inline, directly below the compose bar — like a
   *  keyboard replacing the space a software keyboard would occupy,
   *  with the compose bar (and its toggle button) staying visible and
   *  in the same place the whole time.
   *  "reaction": a standalone full-screen picker opened from a
   *  message's long-press menu — no compose bar involved, so it gets
   *  its own header and close button. */
  mode: "input" | "reaction";
  content?: string;
  onBackspace?: () => void;
}

/** Removes the last full grapheme cluster (so multi-part emoji —
 *  flags, skin tones, ZWJ families — are deleted as one unit, not
 *  one UTF-16 code unit at a time). Falls back to a plain slice on
 *  engines without Intl.Segmenter. */
export function removeLastGrapheme(text: string): string {
  if (!text) return text;
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const segments = [...segmenter.segment(text)].map((s) => s.segment);
    segments.pop();
    return segments.join("");
  }
  return text.slice(0, -1);
}

/**
 * Full emoji picker — a single continuously-scrollable list (Recents,
 * then each category), with plain text section labels instead of
 * tabs. No search.
 */
export function EmojiPickerSheet({ onSelect, onClose, mode, content = "", onBackspace }: EmojiPickerSheetProps) {
  // Only "reaction" mode is a real full-screen modal — "input" mode is
  // inline under the compose bar and shouldn't touch browser history.
  useBackDismiss(onClose ?? (() => {}), mode === "reaction");
  const recents = useRecentEmojis(36);
  const sections = [
    ...(recents.length
      ? [{ key: "recents", label: "Recently used", emojis: recents.map((char) => ({ char, name: char })) }]
      : []),
    ...EMOJI_CATEGORIES,
  ];

  const grid = (
    <div className="flex-1 overflow-y-auto px-3 pb-4">
      {sections.map((section) => (
        <div key={section.key} className="mb-3">
          <p className="text-xs text-ink-muted px-1 pt-2 pb-1">{section.label}</p>
          <div className="grid grid-cols-8 gap-1">
            {section.emojis.map((entry, i) => (
              <button
                key={`${section.key}-${entry.char}-${i}`}
                type="button"
                onClick={() => onSelect(entry.char)}
                className="text-2xl leading-none aspect-square flex items-center justify-center rounded-lg hover:bg-accent-soft active:scale-90 transition-transform"
                aria-label={entry.name}
              >
                {entry.char}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (mode === "input") {
    // Inline, sits directly under the compose bar — no backdrop, no
    // full-screen takeover, nothing covering the toggle button above.
    return (
      <div className="bg-surface border-t border-border max-h-[45vh] min-h-[45vh] flex flex-col">
        <div className="flex items-center justify-end px-3 pt-2 pb-1">
          <button
            type="button"
            onClick={() => onBackspace?.()}
            disabled={!content}
            className="text-ink-muted p-2 disabled:opacity-30"
            aria-label="Backspace"
          >
            <Delete size={20} />
          </button>
        </div>
        {grid}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="font-medium text-ink text-sm">React</h3>
          <button onClick={onClose} className="text-ink-muted" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {grid}
      </div>
    </div>
  );
}
