// src/components/ReactionTray.tsx
import { useRef, type ReactNode, type MouseEvent, type TouchEvent } from "react";

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
  /** Ranked secondary actions (+ owner management), swipable for overflow. */
  middleActions: EngagementAction[];
  /** Save, Share — always visible, never scrolled. */
  rightActions: EngagementAction[];
}

// The row always shows exactly 6 icon slots, evenly spaced (each 1/6 of the
// row's width) — regardless of how those 6 are split across the three
// groups. Left + right are fixed; whatever's left goes to the middle,
// swipable group, so the row is always full and evenly balanced. E.g. on
// your own post Reshare drops out of the left group (1 icon instead of 2),
// so the middle group grows from 2 to 3 visible slots to make up the six —
// one of those extra slots effectively "complements" the missing Reshare
// next to Like.
const VISIBLE_SLOTS = 6;

// A drag that hasn't moved at least this many px is still treated as a tap,
// so a slightly-wobbly finger on Like/Save/etc. doesn't get eaten as a scroll.
const DRAG_THRESHOLD_PX = 6;

function ActionButton({
  action,
  widthPercent,
  wrapClick,
}: {
  action: EngagementAction;
  widthPercent: number;
  /** Only supplied for fixed (left/right) buttons — see drag handling below. */
  wrapClick?: (onClick: (e: MouseEvent) => void) => (e: MouseEvent) => void;
}) {
  return (
    <button
      onClick={wrapClick ? wrapClick(action.onClick) : action.onClick}
      aria-label={action.label}
      className="flex flex-col items-center gap-0.5 flex-shrink-0 text-ink"
      style={{ width: `${widthPercent}%` }}
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
// - middleActions (ranked secondary + owner management) in a swipable strip,
//   sized to show exactly (6 - left.length - right.length) items at a time
// - rightActions (Save, Share) pinned to the right, no scroll
//
// Every slot — fixed or swipable — occupies the same 1/6 share of the row's
// width, so all 6 visible icons end up evenly spaced with no lopsided gaps
// between groups.
//
// Dragging anywhere on the row — including directly on the fixed Like/
// Reshare/Save/Share icons — scrolls the middle swipable strip. The fixed
// icons themselves never move; a touch that starts on one of them is just
// treated as a scroll handle for the middle group once it's clearly a drag
// (past DRAG_THRESHOLD_PX) rather than a tap. Dragging directly on the
// middle strip still uses native overflow-x-auto scrolling as before.
//
// Touch isolation: once a touch is claimed as a drag (on the middle strip,
// or on a fixed icon past the threshold), stopPropagation keeps it from
// bubbling up to Feed's tab-swipe handler. Feed's handleTouchEnd checks
// touchStartX === null and exits early, so no tab change fires even though
// touchEnd still bubbles for plain taps.
export function ReactionTray({ leftActions, middleActions, rightActions }: ReactionTrayProps) {
  const slotPct = 100 / VISIBLE_SLOTS;
  const middleVisibleCount = Math.max(1, VISIBLE_SLOTS - leftActions.length - rightActions.length);
  const hasOverflow = middleActions.length > middleVisibleCount;

  const middleScrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, startScrollLeft: 0, dragging: false });

  function handleFixedTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    dragRef.current = {
      startX: touch.clientX,
      startScrollLeft: middleScrollRef.current?.scrollLeft ?? 0,
      dragging: false,
    };
  }

  function handleFixedTouchMove(e: TouchEvent) {
    const el = middleScrollRef.current;
    const touch = e.touches[0];
    if (!el || !touch) return;

    const deltaX = dragRef.current.startX - touch.clientX;
    if (!dragRef.current.dragging && Math.abs(deltaX) > DRAG_THRESHOLD_PX) {
      dragRef.current.dragging = true;
    }
    if (dragRef.current.dragging) {
      e.stopPropagation();
      el.scrollLeft = dragRef.current.startScrollLeft + deltaX;
    }
  }

  // Swallows the click that a touch-drag would otherwise fire on release —
  // without this, dragging across Like to scroll the middle strip would
  // also toggle Like the moment you lift your finger.
  function guardFixedClick(onClick: (e: MouseEvent) => void) {
    return (e: MouseEvent) => {
      if (dragRef.current.dragging) {
        dragRef.current.dragging = false;
        return;
      }
      onClick(e);
    };
  }

  return (
    <div className="flex items-center mt-3 pt-3 w-full">
      <div
        className="flex flex-shrink-0"
        style={{ width: `${leftActions.length * slotPct}%` }}
        onTouchStart={handleFixedTouchStart}
        onTouchMove={handleFixedTouchMove}
      >
        {leftActions.map((action) => (
          <ActionButton
            key={action.key}
            action={action}
            widthPercent={100 / leftActions.length}
            wrapClick={guardFixedClick}
          />
        ))}
      </div>

      <div className="relative flex-shrink-0" style={{ width: `${middleVisibleCount * slotPct}%` }}>
        <div
          ref={middleScrollRef}
          className="flex overflow-x-auto scrollbar-none"
          onTouchStart={(e) => e.stopPropagation()}
        >
          {middleActions.map((action) => (
            <ActionButton key={action.key} action={action} widthPercent={100 / middleVisibleCount} />
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

      <div
        className="flex flex-shrink-0"
        style={{ width: `${rightActions.length * slotPct}%` }}
        onTouchStart={handleFixedTouchStart}
        onTouchMove={handleFixedTouchMove}
      >
        {rightActions.map((action) => (
          <ActionButton
            key={action.key}
            action={action}
            widthPercent={100 / rightActions.length}
            wrapClick={guardFixedClick}
          />
        ))}
      </div>
    </div>
  );
}
