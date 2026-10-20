// src/components/AnimatedCount.tsx
// A number that rolls when it changes. Going up: the old number scrolls up and out while the new one rises in from
// below with a small bounce. Going down: the same, mirrored (old exits downward, new drops in from above).
// Minimal on purpose — one number, one short move, no colour or scale change.
//
// A count of 0 renders nothing unless `showZero` (so 0→1 animates in and 1→0 animates out, then the slot disappears).
// Pass the raw count; callers no longer need to hide zeros themselves.
import { useEffect, useState } from "react";
import { formatCompactCount } from "../lib/formatStats";

const IN_MS = 340;
const OUT_MS = 170;

const fmt = (n: number, showZero: boolean) => (n > 0 ? formatCompactCount(n) : showZero ? "0" : "");

interface Roll {
  value: number;
  prev: number;
  dir: 1 | -1;
  key: number;
}

export function AnimatedCount({ value, className = "", showZero = false }: { value: number; className?: string; showZero?: boolean }) {
  const [roll, setRoll] = useState<Roll>({ value, prev: value, dir: 1, key: 0 });

  // Derived during render (not in an effect) so the first painted frame of a change is already the animation's start,
  // never a flash of the new number at rest.
  if (roll.value !== value) {
    setRoll({ value, prev: roll.value, dir: value > roll.value ? 1 : -1, key: roll.key + 1 });
  }

  const animating = roll.prev !== roll.value;
  useEffect(() => {
    if (!animating) return;
    const t = setTimeout(() => setRoll((r) => ({ ...r, prev: r.value })), IN_MS);
    return () => clearTimeout(t);
  }, [roll.key, animating]);

  if (roll.value === 0 && !animating && !showZero) return null;

  const dirName = roll.dir > 0 ? "up" : "down";
  return (
    <span className={`relative inline-flex overflow-hidden align-middle tabular-nums ${className}`}>
      {animating && fmt(roll.prev, showZero) !== "" ? (
        <span
          key={`o${roll.key}`}
          aria-hidden="true"
          className="ako-count-anim absolute inset-0"
          style={{ animation: `ako-count-out-${dirName} ${OUT_MS}ms ease-in forwards` }}
        >
          {fmt(roll.prev, showZero)}
        </span>
      ) : null}
      <span
        key={`i${roll.key}`}
        className="ako-count-anim"
        style={animating ? { animation: `ako-count-in-${dirName} ${IN_MS}ms cubic-bezier(0.22, 0.9, 0.3, 1) both` } : undefined}
      >
        {fmt(roll.value, showZero)}
      </span>
    </span>
  );
}
