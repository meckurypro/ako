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
  /** Like, Reshare — always visible, never scrolled. */
  leftActions: EngagementAction[];
  /** Ranked secondary actions (+ owner management). 2 slots visible, swipable for more. */
  middleActions: EngagementAction[];
  /** Save, Share — always visible, never scrolled. */
  rightActions: EngagementAction[];
}

// Width of one action slot (icon + count). SLOT_COUNT sizes the swipable
// middle section to show exactly 2 items at a time.
const SLOT_WIDTH = 44; // px, ~w-11
const SLOT_COUNT = 2;

function ActionButton({ action }: { action: EngagementAction }) {
  return (
    <button
      onClick={action.onClick}
      aria-label={action.label}
      className="flex flex-col items-center gap-0.5 flex-shrink-0 text-ink"
      style={{ width: SLOT_WIDTH }}
    >
      {action.icon}
      {/* min-h keeps button height uniform whether there's a count or not */}
      <span className="text-xs font-semibold leading-none min-h-[1em]">
        {action.count !== null ? action.count : ""}
      </span>
    </button>
  );
}

// Purely presentational. PostCard passes three groups:
// - leftActions (Like, Reshare) pinned to the left, no scroll
// - middleActions (ranked secondary + owner management) in a swipable strip
//   sized to show exactly 2 items at a time, with the rest a left-swipe away
// - rightActions (Save, Share) pinned to the right, no scroll
//
// Touch isolation: onTouchStart on the middle strip calls stopPropagation so
// a horizontal swipe there never bubbles up to Feed's tab-swipe handler.
// Feed's handleTouchEnd checks touchStartX === null and exits early, so no
// tab change fires even though touchEnd still bubbles.
export function ReactionTray({ leftActions, middleActions, rightActions }: ReactionTrayProps) {
  const hasOverflow = middleActions.length > SLOT_COUNT;

  return (
    <div className="flex items-center justify-between mt-3 pt-3">
      <div className="flex items-center flex-shrink-0">
        {leftActions.map((action) => (
          <ActionButton key={action.key} action={action} />
        ))}
      </div>

      <div className="relative flex-shrink-0" style={{ width: SLOT_WIDTH * SLOT_COUNT }}>
        <div
          className="flex overflow-x-auto scrollbar-none"
          onTouchStart={(e) => e.stopPropagation()}
        >
          {middleActions.map((action) => (
            <ActionButton key={action.key} action={action} />
          ))}
        </div>

        {/* Right-edge fade: signals more icons are off-screen */}
        {hasOverflow && (
          <div
            className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-surface dark:from-[#121114] to-transparent pointer-events-none"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex items-center flex-shrink-0">
        {rightActions.map((action) => (
          <ActionButton key={action.key} action={action} />
        ))}
      </div>
    </div>
  );
}
