// src/components/DeleteMessageSheet.tsx
import { Trash2 } from "lucide-react";
import { useBackDismiss } from "../hooks/useBackDismiss";
import type { DeleteScope } from "../hooks/useMessaging";

interface DeleteMessageSheetProps {
  /** How many messages this applies to — singular vs "3 messages" copy. */
  count: number;
  /**
   * Whether "delete for everyone" should be offered at all. False when
   * any selected message isn't the current user's own, or when every
   * selected message is already a tombstone (nothing left to delete
   * for everyone — only "delete for me" clears it from view).
   */
  allowEveryone: boolean;
  onDelete: (scope: DeleteScope) => void;
  onClose: () => void;
}

/**
 * Reached from MessageActionMenu's Delete button (single message) or
 * the multi-select bar's Delete action (bulk). Both scopes carry their
 * own short warning line rather than routing through a second
 * confirmation modal — the choice itself is the deliberate step, and
 * stacking a ConfirmDialog on top of a two-tap flow (long-press → menu
 * → delete) would be one tap too many for something this common.
 */
export function DeleteMessageSheet({ count, allowEveryone, onDelete, onClose }: DeleteMessageSheetProps) {
  useBackDismiss(onClose);
  const plural = count > 1 ? `${count} messages` : "this message";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border pb-[env(safe-area-inset-bottom)]">
        <p className="px-4 pt-4 pb-1 text-sm font-medium text-ink">Delete {plural}?</p>

        <button
          onClick={() => onDelete("me")}
          className="w-full flex items-start gap-3 px-4 py-3.5 text-left"
        >
          <Trash2 size={18} className="text-danger flex-shrink-0 mt-0.5" />
          <span>
            <span className="block text-sm text-ink">Delete for me</span>
            <span className="block text-xs text-ink-muted mt-0.5">
              Removes {count > 1 ? "them" : "it"} from your view only. Can't be undone.
            </span>
          </span>
        </button>

        {allowEveryone && (
          <button
            onClick={() => onDelete("everyone")}
            className="w-full flex items-start gap-3 px-4 py-3.5 text-left border-t border-border"
          >
            <Trash2 size={18} className="text-danger flex-shrink-0 mt-0.5" />
            <span>
              <span className="block text-sm text-danger">Delete for everyone</span>
              <span className="block text-xs text-ink-muted mt-0.5">
                Replaces {count > 1 ? "them" : "it"} with "message deleted" for both of you. Can't be undone.
              </span>
            </span>
          </button>
        )}

        <button onClick={onClose} className="w-full py-3.5 text-sm text-ink-muted border-t border-border mt-1">
          Cancel
        </button>
      </div>
    </div>
  );
}
