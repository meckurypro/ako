// src/components/Pagination.tsx
import { ChevronLeft, ChevronRight } from "lucide-react";

/** 1 … 4 5 6 … 10 — always includes first, last, and the current page's neighbours. */
function pageItems(current: number, total: number): (number | "gap-l" | "gap-r")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | "gap-l" | "gap-r")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("gap-l");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < total - 1) items.push("gap-r");
  items.push(total);
  return items;
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const arrow =
    "w-9 h-9 rounded-lg border border-border bg-surface text-ink flex items-center justify-center disabled:opacity-35 disabled:pointer-events-none";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5">
      <button type="button" className={arrow} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <ChevronLeft size={18} />
      </button>

      {pageItems(page, totalPages).map((item) =>
        typeof item === "string" ? (
          <span key={item} className="w-6 text-center text-ink-muted text-sm select-none">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-label={`Page ${item}`}
            aria-current={item === page ? "page" : undefined}
            className={`min-w-9 h-9 px-2 rounded-lg border text-sm font-medium ${
              item === page
                ? "bg-cta text-white border-cta"
                : "bg-surface text-ink border-border"
            }`}
          >
            {item}
          </button>
        )
      )}

      <button type="button" className={arrow} disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
