// src/components/ReactionTray.tsx
import { useRef, type ReactNode, type MouseEvent, type PointerEvent } from "react";

export interface EngagementAction {
  key: string;
  label: string;       // aria-label on the tray icon; also the visible label in the long-press sheet
  icon: ReactNode;
  /** null → no count shown (space still reserved for height consistency) */
  count: number | null;
  onClick: (e: MouseEvent) => void;
}

interface ReactionTrayProps {
  /** Like — always visible, fixed left. */
  leftActions: EngagementAction[];
  /** Top-ranked (most-used) secondary actions — fill the remaining
   *  visible slots (4 total, minus however many leftActions/rightActions
   *  take). Ranking comes from useEngagementOrder; see PostCard. */
  middleActions: EngagementAction[];
  /** Optional fixed-right actions. Empty for both PostCard and
   *  ProjectCard now — Share used to be pinned here but was moved into
   *  middleActions so only Like stays pinned (see each card's comments).
   *  Left in the props shape rather than removed in case a future caller
   *  genuinely needs a pinned-right slot. */
  rightActions: EngagementAction[];
  /** Small text row rendered directly under the left fixed group — used
   *  for the "Comments: N" label. Sits in the same column as Like, so it
   *  shares that slot's width. */
  belowLeftLabel?: { text: string; onClick: (e: MouseEvent) => void };
  /** Long-pressing any of the visible icons calls this, if provided —
   *  PostCard/ProjectCard open a sheet listing every action in
   *  response. Long-press does nothing if omitted. */
  onOpenMore?: () => void;
}

// Exactly 4 equal-width slots now: Like (left, pinned) + everything
// else ranked by usage filling the rest. No swiping, no overflow
// window to manage — long-pressing ANY of the 4 opens a sheet listing
// every action instead (see onOpenMore below), which is what replaced
// the old horizontally-scrollable middle strip.
const VISIBLE_SLOTS = 4;

// How long a press has to be held before it counts as "long" rather
// than a tap — matches the feel of the message-bubble long-press menu
// elsewhere in the app.
const LONG_PRESS_MS = 450;

// How far (px) the pointer can drift after landing before a hold stops
// counting as a hold and starts counting as a swipe — see
// handlePointerMove below. 10px is roughly what most touch UIs treat
// as the line between "finger settled" and "finger moving."
const MOVE_CANCEL_THRESHOLD_PX = 10;

function ActionButton({
  action,
  widthPercent,
  onOpenMore,
}: {
  action: EngagementAction;
  widthPercent: number;
  onOpenMore?: () => void;
}) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const pressStart = useRef<{ x: number; y: number } | null>(null);

  function startPress(x: number, y: number) {
    if (!onOpenMore) return;
    longPressed.current = false;
    pressStart.current = { x, y };
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      if (navigator.vibrate) navigator.vibrate(15);
      onOpenMore();
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
    pressStart.current = null;
  }

  // If a swipe is already under way — e.g. the finger landed on this
  // icon mid-gesture while scrolling/swiping the feed — pointer capture
  // below means this button keeps receiving the move events even
  // though the user never meant to press it. Once the finger has moved
  // past a small threshold, this stops being a "hold" and starts being
  // a swipe, so the long-press timer is cancelled instead of firing
  // ReactionMoreSheet out from under an in-progress gesture.
  function handlePointerMove(e: PointerEvent) {
    if (!pressStart.current) return;
    const dx = e.clientX - pressStart.current.x;
    const dy = e.clientY - pressStart.current.y;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_THRESHOLD_PX) cancelPress();
  }

  function handleClick(e: MouseEvent) {
    // The long-press timer already fired onOpenMore — don't also fire
    // the tap action once the finger lifts.
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    action.onClick(e);
  }

  return (
    <button
      onClick={handleClick}
      onPointerDown={(e: PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        startPress(e.clientX, e.clientY);
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={action.label}
      className="flex flex-row items-center justify-center gap-2 py-1.5 flex-shrink-0 text-ink select-none"
      style={{ width: `${widthPercent}%`, touchAction: "manipulation", WebkitTouchCallout: "none" }}
    >
      {action.icon}
      {action.count !== null && (
        <span className="text-sm font-semibold leading-none">{action.count}</span>
      )}
    </button>
  );
}

// Purely presentational, and much simpler than the tray this replaced:
// 4 fixed, evenly-spaced slots (Like pinned left, the rest ranked by
// usage), each bigger than before now that there's no overflow strip
// competing for width. Long-pressing any of the 4 opens
// ReactionMoreSheet (rendered by PostCard/ProjectCard) with the
// complete action list — see moreActions above.
export function ReactionTray({
  leftActions,
  middleActions,
  rightActions,
  onOpenMore,
  belowLeftLabel,
}: ReactionTrayProps) {
  const slotPct = 100 / VISIBLE_SLOTS;
  // Reserved by capacity, not by middleActions.length — keeps a caller's
  // rightActions (if any are ever passed) pinned to the true right edge
  // instead of drifting inward after a short middle group. rightActions
  // is empty for both current callers, so this is effectively just
  // "everything not Like."
  const middleSlotCount = Math.max(0, VISIBLE_SLOTS - leftActions.length - rightActions.length);
  const middleItemWidth = 100 / Math.max(middleActions.length, 1);

  return (
    <div className="flex items-start mt-4 pt-4 pb-1 w-full" data-swipeable-ignore>
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: `${leftActions.length * slotPct}%` }}>
        <div className="flex w-full">
          {leftActions.map((action) => (
            <ActionButton key={action.key} action={action} widthPercent={100 / leftActions.length} onOpenMore={onOpenMore} />
          ))}
        </div>

        {belowLeftLabel && (
          <button
            onClick={belowLeftLabel.onClick}
            className="text-xs font-medium leading-none text-ink-muted mt-2 whitespace-nowrap"
          >
            {belowLeftLabel.text}
          </button>
        )}
      </div>

      <div className="flex flex-shrink-0" style={{ width: `${middleSlotCount * slotPct}%` }}>
        {middleActions.map((action) => (
          <ActionButton key={action.key} action={action} widthPercent={middleItemWidth} onOpenMore={onOpenMore} />
        ))}
      </div>

      <div className="flex flex-shrink-0" style={{ width: `${rightActions.length * slotPct}%` }}>
        {rightActions.map((action) => (
          <ActionButton key={action.key} action={action} widthPercent={100 / rightActions.length} onOpenMore={onOpenMore} />
        ))}
      </div>
    </div>
  );
}
