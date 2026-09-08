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
  /** Top-ranked (most-used) secondary actions — exactly enough to fill
   *  out the row to 4 total with left/right. Ranking comes from
   *  useEngagementOrder; see PostCard. */
  middleActions: EngagementAction[];
  /** Share — always visible, fixed right. */
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

// Exactly 4 equal-width slots now: Like (left) + 2 ranked-by-usage
// middle + Share (right). No swiping, no overflow window to manage —
// long-pressing ANY of the 4 opens a sheet listing every action
// instead (see onOpenMore below), which is what replaced the old
// horizontally-scrollable middle strip.
const VISIBLE_SLOTS = 4;

// How long a press has to be held before it counts as "long" rather
// than a tap — matches the feel of the message-bubble long-press menu
// elsewhere in the app.
const LONG_PRESS_MS = 450;

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

  function startPress() {
    if (!onOpenMore) return;
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      if (navigator.vibrate) navigator.vibrate(15);
      onOpenMore();
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
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
        startPress();
      }}
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
// 4 fixed, evenly-spaced slots (Like, 2 ranked-by-usage, Share), each
// bigger than before now that there's no overflow strip competing for
// width. Long-pressing any of the 4 opens ReactionMoreSheet (rendered
// by PostCard) with the complete action list — see moreActions above.
export function ReactionTray({
  leftActions,
  middleActions,
  rightActions,
  onOpenMore,
  belowLeftLabel,
}: ReactionTrayProps) {
  const slotPct = 100 / VISIBLE_SLOTS;
  // Reserved by capacity, not by middleActions.length — keeps Share
  // pinned to the true right edge even when a caller has fewer middle
  // actions than the row has room for (e.g. ProjectCard's owner view
  // on a non-room project, where there's nothing to put in the middle
  // at all), instead of Share drifting inward to sit right after a
  // short middle group.
  const middleSlotCount = Math.max(0, VISIBLE_SLOTS - leftActions.length - rightActions.length);
  const middleItemWidth = 100 / Math.max(middleActions.length, 1);

  return (
    <div className="flex items-start mt-4 pt-4 pb-1 w-full">
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
