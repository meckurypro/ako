// src/components/comments/StanceFilter.tsx
import type { StanceFilter as Filter } from "../../hooks/useComments";
import type { Stance } from "../../types/database";
import { AnimatedCount } from "../AnimatedCount";
import { STANCE_ORDER, STANCE_TONE } from "./stance";

export type StanceCounts = Record<Stance, number>;

/**
 * "All · Support 4 · Question 1 · Pushback 2 · Comment 3" — plain text tabs, the active one underlined in its own stance
 * colour. Only offered when at least two stances have replies; with one there's nothing to filter between.
 */
export function StanceFilterBar({
  counts,
  total,
  value,
  onChange,
}: {
  counts: StanceCounts;
  total: number;
  value: Filter;
  onChange: (next: Filter) => void;
}) {
  const present = STANCE_ORDER.filter((s) => counts[s] > 0);
  if (present.length < 2) return null;

  const tab = "relative py-2.5 text-sm transition-colors border-b-2 -mb-px";
  return (
    <div className="flex items-center gap-5 border-b border-border" role="tablist" aria-label="Filter replies by stance">
      <button
        role="tab"
        aria-selected={value === "all"}
        onClick={() => onChange("all")}
        className={`${tab} ${value === "all" ? "text-ink font-medium border-ink" : "text-ink-muted border-transparent hover:text-ink"}`}
      >
        All
        <AnimatedCount value={total} showZero className="ml-1 text-xs text-ink-muted" />
      </button>
      {present.map((s) => {
        const tone = STANCE_TONE[s];
        const active = value === s;
        return (
          <button
            key={s}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s)}
            className={`${tab} ${active ? `${tone.text} font-medium ${tone.underline}` : "text-ink-muted border-transparent hover:text-ink"}`}
          >
            {tone.noun}
            <AnimatedCount value={counts[s]} showZero className="ml-1 text-xs opacity-70" />
          </button>
        );
      })}
    </div>
  );
}
