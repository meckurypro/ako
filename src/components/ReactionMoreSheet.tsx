// src/components/ReactionMoreSheet.tsx
import { useBackDismiss, runAfterDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { Portal } from "./Portal";
import type { EngagementAction } from "./ReactionTray";

interface ReactionMoreSheetProps {
  actions: EngagementAction[];
  onClose: () => void;
}

/**
 * Long-pressing any of ReactionTray's 4 visible icons opens this —
 * a full list of every engagement action for the post (all secondary
 * actions regardless of usage rank, plus owner management), so
 * nothing is out of reach just because it didn't make the visible 4.
 * Portaled to escape SwipeableTabs' transformed pane (see Portal.tsx)
 * since this opens from inside PostCard, same as ReshareSheet/
 * StanceComposer/GiftPicker.
 */
export function ReactionMoreSheet({ actions, onClose }: ReactionMoreSheetProps) {
  useBackDismiss(onClose);
  useScrollLock();

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />
        <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-4 gap-y-4 px-2 pt-5 pb-2">
            {actions.map((action) => (
              <button
                key={action.key}
                onClick={(e) => {
                  // See runAfterDismiss (useBackDismiss.ts) — waits for
                  // the actual popstate from this sheet's dismiss
                  // instead of racing it with a blind setTimeout(fn, 0),
                  // which is what made these icons "try to do something"
                  // and then silently revert.
                  runAfterDismiss(onClose, () => action.onClick(e));
                }}
                // select-none + WebkitTouchCallout mirror ActionButton in
                // ReactionTray.tsx — this sheet mounts at the exact moment
                // the long-press that opened it is still held down, which
                // is also right when a mobile browser's own long-press-to-
                // select-text timer fires. Without these, whichever label
                // happens to render under the still-resting finger gets
                // natively selected/highlighted (plus the iOS copy/share
                // callout) the instant the sheet appears, so it reads as
                // "already highlighted" and the user has to tap elsewhere
                // to clear a selection they never asked for.
                className="flex flex-col items-center gap-1.5 text-ink select-none"
                style={{ WebkitTouchCallout: "none" }}
              >
                {action.icon}
                <span className="text-[11px] text-ink-muted leading-tight text-center select-none">
                  {action.label}
                  {action.count !== null ? ` (${action.count})` : ""}
                </span>
              </button>
            ))}
          </div>
          <button onClick={onClose} className="w-full py-3.5 text-sm text-ink-muted border-t border-border mt-2">
            Cancel
          </button>
        </div>
      </div>
    </Portal>
  );
}
