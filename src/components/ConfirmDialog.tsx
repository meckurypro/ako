// src/components/ConfirmDialog.tsx
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";

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
 * used before deleting a chat (single or bulk), before deleting a
 * message "for everyone" (single or bulk), before unfollowing someone
 * (when it's worth a pause — see ProfilePage's startUnfollow), and
 * before removing a follower. Reversible, low-stakes actions (archive,
 * hide, pin, star, unarchive, mute) should never go through this;
 * it's specifically for the handful of actions that can't be undone
 * or that affect the other participant too.
 *
 * Built on the shared <Modal> wrapper (see Modal.tsx / index.css's
 * .ako-overlay-panel) — a fixed dark-glass panel with light text
 * regardless of the app's own light/dark theme, so this reads the
 * same everywhere it appears. `danger` still controls severity, but
 * as a desaturated warm/cool tint on that dark panel rather than a
 * saturated red/green pulled straight off the light-mode palette —
 * calm and intentional, not alarming, per AKO's overlay-revamp pass.
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
  return (
    <Modal onClose={onCancel} role="alertdialog" ariaLabel={title}>
      <div className="flex items-start gap-4">
        {danger && (
          <span className="flex-shrink-0 w-10 h-10 rounded-full bg-overlay-danger-soft text-overlay-danger flex items-center justify-center">
            <AlertTriangle size={19} />
          </span>
        )}
        <div className="min-w-0 pt-0.5">
          <p className="font-medium text-overlay-ink text-[15px] leading-snug">{title}</p>
          <p className="text-sm text-overlay-ink-muted mt-2 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-7">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-full bg-overlay-surface-raised text-sm font-medium text-overlay-ink"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 py-3 rounded-full text-sm font-medium text-overlay-surface ${
            danger ? "bg-overlay-danger" : "bg-overlay-accent"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
