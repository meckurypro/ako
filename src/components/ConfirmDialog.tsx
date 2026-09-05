// src/components/ConfirmDialog.tsx
import { AlertTriangle } from "lucide-react";
import { useBackDismiss } from "../hooks/useBackDismiss";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Red confirm button + warning icon. Defaults true — this component only exists for things worth pausing on. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The one place every "are you sure?" prompt in the app goes through —
 * used before deleting a chat (single or bulk) and before deleting a
 * message "for everyone" (single or bulk). Reversible, low-stakes
 * actions (archive, hide, pin, star, unarchive) should never go through
 * this; it's specifically for the handful of actions that can't be
 * undone or that affect the other participant too.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useBackDismiss(onCancel);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/50" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-surface rounded-2xl border border-border p-5 shadow-xl">
        <div className="flex items-start gap-3">
          {danger && (
            <span className="flex-shrink-0 w-9 h-9 rounded-full bg-red-50 text-danger flex items-center justify-center">
              <AlertTriangle size={18} />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-medium text-ink">{title}</p>
            <p className="text-sm text-ink-muted mt-1">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-full border border-border text-sm font-medium text-ink"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-full text-sm font-medium ${
              danger ? "bg-danger text-canvas" : "bg-accent text-canvas"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
