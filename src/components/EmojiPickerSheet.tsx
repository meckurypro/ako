// src/components/EmojiPickerSheet.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { X, Delete, Clock, Smile, Hand, Heart, PawPrint, Utensils, Trophy, Lightbulb, Hash, type LucideIcon } from "lucide-react";
import { EMOJI_CATEGORIES } from "../lib/emojiData";
import { useRecentEmojis } from "../hooks/useMessageReactions";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";

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
  /** "input" mode only. The on-screen keyboard's own last-measured
   *  height (see useKeyboardInset) — sizing the tray to this instead
   *  of a fixed vh guess means it occupies exactly the space the
   *  keyboard would have, so toggling between the two never changes
   *  how much of the screen the message list gets. */
  heightPx?: number;
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

const SECTION_ICONS: Record<string, LucideIcon> = {
  recents: Clock,
  smileys: Smile,
  gestures: Hand,
  hearts: Heart,
  animals: PawPrint,
  food: Utensils,
  activities: Trophy,
  objects: Lightbulb,
  symbols: Hash,
};

/**
 * Full emoji picker — one continuously-scrollable list (Recents, then each category) with a category strip on
 * top: tap an icon to jump to that section, and the active icon follows the scroll. Section labels stick to the
 * top of the list while you scroll through them. No search.
 *
 * "input" mode is the tray under the composer. It is a flex child of the chat column (never positioned past the
 * bottom of the screen) and pads for the device's bottom safe area, so its last row is always reachable.
 */
export function EmojiPickerSheet({ onSelect, onClose, mode, content = "", onBackspace, heightPx }: EmojiPickerSheetProps) {
  // Only "reaction" mode is a real full-screen modal — "input" mode is
  // inline under the compose bar and shouldn't touch browser history.
  useBackDismiss(onClose ?? (() => {}), mode === "reaction");
  useScrollLock(mode === "reaction");
  const recents = useRecentEmojis(36);
  const sections = [
    ...(recents.length
      ? [{ key: "recents", label: "Recently used", emojis: recents.map((char) => ({ char, name: char })) }]
      : []),
    ...EMOJI_CATEGORIES,
  ];

  const scrollerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeKey, setActiveKey] = useState<string>(sections[0]?.key ?? "smileys");
  // While a tap-to-jump scroll is animating, the scroll-spy below must not fight it.
  const jumpingUntil = useRef(0);

  const handleScroll = useCallback(() => {
    if (Date.now() < jumpingUntil.current) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const top = scroller.getBoundingClientRect().top + 8;
    let current = sections[0]?.key;
    for (const section of sections) {
      const el = sectionRefs.current[section.key];
      if (el && el.getBoundingClientRect().top <= top) current = section.key;
    }
    if (current) setActiveKey(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.length]);

  useEffect(() => {
    handleScroll();
  }, [handleScroll]);

  function jumpTo(key: string) {
    const scroller = scrollerRef.current;
    const el = sectionRefs.current[key];
    if (!scroller || !el) return;
    setActiveKey(key);
    jumpingUntil.current = Date.now() + 450;
    scroller.scrollTo({ top: el.offsetTop - scroller.offsetTop, behavior: "smooth" });
  }

  const strip = (
    <div className="flex items-center border-b border-border/70 px-2">
      <div className="no-scrollbar flex flex-1 items-center overflow-x-auto">
        {sections.map((section) => {
          const Icon = SECTION_ICONS[section.key] ?? Smile;
          const active = activeKey === section.key;
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => jumpTo(section.key)}
              aria-label={section.label}
              aria-pressed={active}
              className={`relative flex h-11 min-w-[44px] flex-1 items-center justify-center transition-colors ${
                active ? "text-accent" : "text-ink-muted"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span
                className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent transition-opacity ${
                  active ? "opacity-100" : "opacity-0"
                }`}
              />
            </button>
          );
        })}
      </div>
      {mode === "input" && (
        <button
          type="button"
          onClick={() => onBackspace?.()}
          disabled={!content}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center text-ink-muted disabled:opacity-30"
          aria-label="Backspace"
        >
          <Delete size={21} />
        </button>
      )}
    </div>
  );

  const grid = (
    <div ref={scrollerRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
      {sections.map((section) => (
        <div
          key={section.key}
          ref={(el) => {
            sectionRefs.current[section.key] = el;
          }}
        >
          <p className="sticky top-0 z-10 bg-surface/95 px-2 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted backdrop-blur-sm">
            {section.label}
          </p>
          <div className="grid grid-cols-8 gap-y-0.5">
            {section.emojis.map((entry, i) => (
              <button
                key={`${section.key}-${entry.char}-${i}`}
                type="button"
                onClick={() => onSelect(entry.char)}
                className="flex aspect-square items-center justify-center rounded-xl text-[28px] leading-none transition-transform active:scale-90 active:bg-ink/5"
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
    // Inline, sits directly under the compose bar — no backdrop, no full-screen takeover, nothing covering the
    // toggle button above. Sized to the keyboard's own measured height (falling back to a vh guess before one has
    // ever been measured) so swapping keyboard ↔ tray never changes how much of the chat is visible.
    return (
      <div
        className="flex flex-col border-t border-border bg-surface"
        style={{
          height: heightPx ?? "42dvh",
          minHeight: heightPx ?? "42dvh",
          maxHeight: heightPx ?? "42dvh",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {strip}
        {grid}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 ako-keyboard-aware z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />
      <div className="relative flex max-h-[70vh] w-full max-w-xl flex-col rounded-t-2xl border-t border-border bg-surface">
        <div className="flex items-center justify-between px-4 pb-1 pt-4">
          <h3 className="text-sm font-medium text-ink">React</h3>
          <button onClick={onClose} className="text-ink-muted" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {strip}
        {grid}
      </div>
    </div>
  );
}
