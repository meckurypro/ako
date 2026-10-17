// src/components/book/Stars.tsx
// Star display and star picker shared by the reader's review sheet (reader-theme colours)
// and the project page's Reviews section (app-theme classes).
import { Star } from "lucide-react";

interface StarColors {
  /** CSS colours. When omitted the app's accent / border classes are used instead. */
  on?: string;
  off?: string;
}

export function StarRow({ rating, size = 14, on, off }: { rating: number; size?: number } & StarColors) {
  const filled = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={on ? undefined : n <= filled ? "text-accent" : "text-border"}
          style={on ? { color: n <= filled ? on : off } : undefined}
          fill={n <= filled ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

export function StarPicker({
  value,
  onChange,
  size = 34,
  on,
  off,
}: {
  value: number;
  onChange: (n: number) => void;
  size?: number;
} & StarColors) {
  return (
    <div className="flex items-center justify-center gap-1.5" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === value}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onClick={() => onChange(n)}
          className="p-0.5 transition-transform active:scale-90"
        >
          <Star
            size={size}
            className={on ? undefined : n <= value ? "text-accent" : "text-border"}
            style={on ? { color: n <= value ? on : off } : undefined}
            fill={n <= value ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );
}
