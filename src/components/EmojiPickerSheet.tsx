// src/components/EmojiPickerSheet.tsx
import { X, Delete } from "lucide-react";
import { EMOJI_CATEGORIES } from "../lib/emojiData";
import { useRecentEmojis } from "../hooks/useMessageReactions";

interface EmojiPickerSheetProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  /** "input" shows the live message preview + backspace at the top
   *  (opened from the compose bar); "reaction" shows a plain header
   *  (opened from a message's reaction picker — there's no draft to
   *  preview, and picking an emoji closes the sheet immediately). */
  mode?: "input" | "reaction";
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
 * tabs. No search. When opened from the compose bar, the message
 * draft stays visible at the top so taps are visible as you go.
 */
export function EmojiPickerSheet({
  onSelect,
  onClose,
  mode = "reaction",
  content = "",
  onBackspace,
}: EmojiPickerSheetProps) {
  const recents = useRecentEmojis(36);

  const sections = [
    ...(recents.length ? [{ key: "recents", label: "Recently used", emojis: recents.map((char) => ({ char, name: char })) }] : []),
    ...EMOJI_CATEGORIES,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border max-h-[70vh] flex flex-col">
        {mode === "input" ? (
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            {/* Plain display of the draft, not a real input — keeps the
                native keyboard from popping up and fighting the panel
                for screen space. Typing resumes via the keyboard-mode
                toggle button in the compose bar. */}
            <div className="flex-1 min-w-0 px-4 py-2.5 rounded-full border border-border bg-canvas text-sm min-h-[42px] flex items-center">
              {content ? (
                <span className="text-ink whitespace-pre-wrap break-words truncate">{content}</span>
              ) : (
                <span className="text-ink-muted">Message…</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onBackspace?.()}
              disabled={!content}
              className="text-ink-muted flex-shrink-0 p-2 disabled:opacity-30"
              aria-label="Backspace"
            >
              <Delete size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="font-medium text-ink text-sm">React</h3>
            <button onClick={onClose} className="text-ink-muted" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {sections.map((section) => (
            <div key={section.key} className="mb-3">
              <p className="text-xs text-ink-muted px-1 pt-2 pb-1">{section.label}</p>
              <div className="grid grid-cols-8 gap-1">
                {section.emojis.map((entry, i) => (
                  <button
                    key={`${section.key}-${entry.char}-${i}`}
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
      </div>
    </div>
  );
}
