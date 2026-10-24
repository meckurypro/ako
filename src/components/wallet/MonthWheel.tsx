// src/components/wallet/MonthWheel.tsx
//
// Month + year scroll wheels (the picker in the Transactions "Month" and "Time Frame" sheets). Plain scroll-snap —
// no library — so it works with touch, trackpad, mouse wheel and the keyboard. Future months can't be picked:
// scrolling past the current month glides back to it.
import { useEffect, useRef } from "react";
import { clampToNow, ymOf, type YearMonth } from "../../lib/walletRange";

const ITEM = 40; // px per row; the wheel shows five rows, the middle one is the selection
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const YEARS_BACK = 3;

function Wheel({
  items,
  index,
  maxIndex,
  onChange,
  label,
}: {
  items: string[];
  index: number;
  maxIndex: number;
  onChange: (index: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  // Keep the scroll position in step with the selected value (initial mount, and when the parent changes it).
  useEffect(() => {
    const el = ref.current;
    if (el && Math.abs(el.scrollTop - index * ITEM) > 1) el.scrollTo({ top: index * ITEM });
  }, [index]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function settle() {
    const el = ref.current;
    if (!el) return;
    let next = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM)));
    if (next > maxIndex) {
      next = maxIndex;
      el.scrollTo({ top: next * ITEM, behavior: "smooth" });
    }
    if (next !== index) onChange(next);
  }

  function goTo(i: number) {
    const clamped = Math.max(0, Math.min(maxIndex, i));
    ref.current?.scrollTo({ top: clamped * ITEM, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-1 top-1/2 h-10 -translate-y-1/2 rounded-xl bg-accent-soft/70" aria-hidden="true" />
      <div
        ref={ref}
        role="listbox"
        aria-label={label}
        tabIndex={0}
        onScroll={() => {
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(settle, 110);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            goTo(index + 1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            goTo(index - 1);
          }
        }}
        className="no-scrollbar relative h-[200px] snap-y snap-mandatory overflow-y-auto overscroll-contain outline-none"
      >
        <div style={{ height: ITEM * 2 }} aria-hidden="true" />
        {items.map((text, i) => (
          <div
            key={text}
            role="option"
            aria-selected={i === index}
            onClick={() => goTo(i)}
            className={`flex h-10 cursor-pointer snap-center items-center justify-center text-lg tabular-nums transition-colors ${
              i === index ? "font-semibold text-ink" : i > maxIndex ? "text-ink-muted/30" : "text-ink-muted"
            }`}
          >
            {text}
          </div>
        ))}
        <div style={{ height: ITEM * 2 }} aria-hidden="true" />
      </div>
    </div>
  );
}

export function MonthYearPicker({ value, onChange }: { value: YearMonth; onChange: (value: YearMonth) => void }) {
  const now = ymOf();
  const years = Array.from({ length: YEARS_BACK + 1 }, (_, i) => now.year - YEARS_BACK + i);
  const yearIndex = Math.max(0, years.indexOf(value.year));
  const monthMax = value.year >= now.year ? now.month : 11;
  const safe = clampToNow(value);

  return (
    <div className="grid grid-cols-2 gap-2">
      <Wheel
        label="Month"
        items={MONTHS}
        index={safe.month}
        maxIndex={monthMax}
        onChange={(m) => onChange(clampToNow({ year: value.year, month: m }))}
      />
      <Wheel
        label="Year"
        items={years.map(String)}
        index={yearIndex}
        maxIndex={years.length - 1}
        onChange={(i) => onChange(clampToNow({ year: years[i], month: value.month }))}
      />
    </div>
  );
}
