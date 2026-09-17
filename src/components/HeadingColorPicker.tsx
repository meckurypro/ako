// src/components/HeadingColorPicker.tsx
import { useLayoutEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { Portal } from "./Portal";
import { HEADING_COLORS, getHeadingColorDef } from "../lib/headingColors";

interface HeadingColorPickerProps {
  value: string | null;
  onChange: (key: string | null) => void;
}

/**
 * The small swatch button that sits next to Compose/EditPost's heading
 * input, plus the anchored popover it opens (same anchored-popover
 * pattern as ReactionOptionsPopover — measure after mount, clamp to
 * viewport, close on back-gesture via useBackDismiss).
 *
 * The button itself always shows the *current* pick (or a neutral
 * outlined ring when none is set) rather than a generic palette icon —
 * so glancing at the heading row alone tells you what's selected
 * without opening the popover.
 */
export function HeadingColorPicker({ value, onChange }: HeadingColorPickerProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ top: number; left: number; opacity: number }>({
    top: 0,
    left: 0,
    opacity: 0,
  });

  useBackDismiss(open ? () => setOpen(false) : () => {});

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = buttonRef.current;
    const card = cardRef.current;
    if (!anchor || !card) return;
    const anchorRect = anchor.getBoundingClientRect();
    const { width, height } = card.getBoundingClientRect();
    const left = Math.min(
      Math.max(anchorRect.left + anchorRect.width / 2 - width / 2, 8),
      window.innerWidth - width - 8
    );
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const top =
      spaceBelow > height + 12 ? anchorRect.bottom + 8 : anchorRect.top - height - 8;
    setStyle({ top, left, opacity: 1 });
  }, [open]);

  const currentDef = getHeadingColorDef(value);
  // Sapphire (the default) isn't in HEADING_COLORS as its own hex pair
  // — it's just --color-post-header, the token every heading already
  // used before this picker existed. This is the one spot that needs
  // its own swatch entry for it, so the button/grid can render and
  // select it exactly like the other 7.
  const swatchStyle = (key: string) => ({
    backgroundColor: key === "sapphire" ? "var(--color-post-header)" : `var(--color-heading-${key})`,
  });

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={currentDef ? `Heading color: ${currentDef.label}` : "Heading color"}
        aria-expanded={open}
        className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-transform active:scale-90 ${
          currentDef ? "" : "border-2 border-dashed border-ink-muted/40"
        }`}
        style={currentDef ? swatchStyle(currentDef.key) : undefined}
      />

      {open && (
        <Portal>
          <div className="fixed inset-0 z-50" role="dialog" aria-label="Choose heading color">
            <div className="absolute inset-0" onClick={() => setOpen(false)} />
            <div
              ref={cardRef}
              className="absolute bg-surface dark:bg-[#1C1C1E] border border-border dark:border-overlay-border rounded-2xl shadow-lg p-3 w-max max-w-[88vw] transition-opacity duration-100"
              style={{ top: style.top, left: style.left, opacity: style.opacity }}
            >
              <div className="grid grid-cols-4 gap-3">
                {/* "Default" — clears the pick, back to --color-post-header
                    with no override. Same dashed-ring look as the button's
                    own unset state, so the two visually match up. */}
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  aria-label="Default heading color"
                  className="w-9 h-9 rounded-full border-2 border-dashed border-ink-muted/40 flex items-center justify-center"
                >
                  {value === null && <Check size={16} className="text-ink-muted" />}
                </button>

                {HEADING_COLORS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      onChange(c.key);
                      setOpen(false);
                    }}
                    aria-label={c.label}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={swatchStyle(c.key)}
                  >
                    {/* A white badge behind the check, not just a colored
                        icon — the swatch fill varies too widely (deep wine
                        to pale dark-mode gold) for one fixed icon color to
                        stay legible against all 8 plus their dark variants. */}
                    {value === c.key && (
                      <span className="w-4 h-4 rounded-full bg-white/95 flex items-center justify-center shadow-sm">
                        {/* Fixed dark gray, not text-ink — this badge is
                            always white regardless of app theme, so the
                            check needs a theme-independent dark color to
                            match, not one that flips near-white in dark
                            mode. */}
                        <Check size={11} className="text-neutral-800" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
