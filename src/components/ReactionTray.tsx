// src/components/ReactionTray.tsx
import type { ReactNode, MouseEvent } from "react";

export interface EngagementAction {
  key: string;
  label: string;       // aria-label only — not shown visually
  icon: ReactNode;
  /** null → no count shown (space still reserved for height consistency) */
  count: number | null;
  onClick: (e: MouseEvent) => void;
}

interface ReactionTrayProps {
  actions: EngagementAction[];
}

// Purely presentational. PostCard passes all 7 actions (Like + 6 ranked
// secondary) and this component renders them in a horizontally-scrollable
// row. The first ~5 are visible; the rest reveal on a left-swipe.
//
// Touch isolation: onTouchStart calls stopPropagation so a horizontal
// swipe on the tray never bubbles up to Feed's tab-swipe handler.
// Feed's handleTouchEnd checks touchStartX === null and exits early,
// so no tab change fires even though touchEnd still bubbles.
export function ReactionTray({ actions }: ReactionTrayProps) {
  return (
    <div className="relative border-t border-border dark:border-[#1B1A17] mt-3 pt-3">
      {/* Scrollable row */}
      <div
        className="flex overflow-x-auto scrollbar-none"
        // Prevent the Feed's tab-swipe handler from seeing this touch.
        onTouchStart={(e) => e.stopPropagation()}
      >
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={action.onClick}
            aria-label={action.label}
            // w-14 (56px) gives ~5.5–5.8 visible items on typical phones,
            // so the 6th icon peeks at the right edge — signalling scrollability.
            className="flex flex-col items-center gap-1 flex-shrink-0 w-14 text-accent"
          >
            {action.icon}
            {/* min-h keeps button height uniform whether there's a count or not */}
            <span className="text-sm font-semibold leading-none min-h-[1em]">
              {action.count !== null ? action.count : ""}
            </span>
          </button>
        ))}
      </div>

      {/* Right-edge fade: signals that more icons are off-screen */}
      <div
        className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface to-transparent pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
