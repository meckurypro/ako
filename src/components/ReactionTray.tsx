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

// The row always shows exactly 5 icon slots, evenly spaced (each 1/5 of the
// row's width): Like fixed on the left, Share fixed on the right, and 3
// swipable slots in between for everything else (Reshare, Save, Support,
// Disagree, Pushback, Dislike, Gift — ranked by usage — plus owner-only
// Edit/Archive/Delete). Left and right are always exactly 1 icon each now,
// so the middle group's visible window is a constant 3 — it never needs to
// grow or shrink to compensate the way it used to when Reshare/Save could
// still appear as fixed slots.
const VISIBLE_SLOTS = 5;

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
      className="flex flex-row items-center justify-center gap-1 flex-shrink-0 text-ink"
      style={{ width: `${widthPercent}%` }}
    >
      {action.icon}
      {action.count !== null && (
        <span className="text-xs font-semibold leading-none">{action.count}</span>
      )}
    </button>
  );
}

// Purely presentational. PostCard passes three groups:
// - leftActions (Like) pinned to the left, no scroll
// - middleActions (Reshare, Save + ranked secondary + owner management) in a
//   swipable strip, sized to show exactly (5 - left.length - right.length)
//   items at a time — a constant 3, since left/right are always 1 icon each
// - rightActions (Share) pinned to the right, no scroll
//
// Every slot — fixed or swipable — occupies the same 1/5 share of the row's
// width, so all 5 visible icons end up evenly spaced with no lopsided gaps
// between groups.
//
// Dragging anywhere on the row — including directly on the fixed Like/Share
// icons — scrolls the middle swipable strip. The fixed icons themselves
// never move; a touch that starts on one of them is just treated as a
// scroll handle for the middle group once it's clearly a drag (past
// DRAG_THRESHOLD_PX) rather than a tap. Dragging directly on the middle
// strip still uses native overflow-x-auto scrolling as before.
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
