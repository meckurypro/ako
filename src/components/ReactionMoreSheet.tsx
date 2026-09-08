// src/components/ReactionMoreSheet.tsx
import { useBackDismiss } from "../hooks/useBackDismiss";
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

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-canvas/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-4 gap-y-4 px-2 pt-5 pb-2">
            {actions.map((action) => (
              <button
                key={action.key}
                onClick={(e) => {
                  // Same ordering fix as DropdownMenu: close (and let
                  // useBackDismiss's dummy history entry pop) before
                  // running an action that might itself navigate (e.g.
                  // the owner's Edit) — otherwise that navigation's push
                  // lands on top of the dummy entry and the pending
                  // history.back() reverts it instead.
                  onClose();
                  setTimeout(() => action.onClick(e), 0);
                }}
                className="flex flex-col items-center gap-1.5 text-ink"
              >
                {action.icon}
                <span className="text-[11px] text-ink-muted leading-tight text-center">
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
