// src/components/course/ProgressBar.tsx
// Course progress bar whose fill glides to its new width instead of jumping.
export function ProgressBar({ pct, height = 6 }: { pct: number; height?: number }) {
  return (
    <div
      className="overflow-hidden rounded-full bg-border"
      style={{ height }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}
