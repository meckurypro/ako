// src/components/SaveProgressDialog.tsx
//
// Shown when someone tries to leave Compose / New project with progress that isn't saved anywhere yet (see
// useLeaveGuard). Two real choices — keep what they have as a draft, or throw it away — plus a quiet way back to
// the form. (Not to be confused with UnsavedChangesDialog, which is the Book builder's "staged edits" prompt.)
//
// Built on the shared <Modal> with browser-back-closes-me switched OFF: this dialog exists because a navigation was
// just held, and the history entry useBackDismiss would push is popped on unmount — i.e. right after the held
// navigation is let through, taking the destination page with it.
import { Save } from "lucide-react";
import { Modal } from "./Modal";

interface SaveProgressDialogProps {
  title?: string;
  description: string;
  saveLabel?: string;
  discardLabel?: string;
  /** Save can't run yet (e.g. a post draft needs a heading or some details). `saveHint` says why. */
  saveDisabled?: boolean;
  saveHint?: string;
  /** A save is in flight — buttons lock so it can't be fired twice or dismissed mid-write. */
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onKeepEditing: () => void;
}

export function SaveProgressDialog({
  title = "Save your progress?",
  description,
  saveLabel = "Save draft",
  discardLabel = "Discard",
  saveDisabled = false,
  saveHint,
  saving = false,
  onSave,
  onDiscard,
  onKeepEditing,
}: SaveProgressDialogProps) {
  return (
    <Modal onClose={saving ? () => {} : onKeepEditing} role="alertdialog" title={title} backDismiss={false}>
      <div className="flex items-start gap-4">
        <span className="flex-shrink-0 w-10 h-10 rounded-full bg-overlay-surface-raised text-overlay-ink flex items-center justify-center">
          <Save size={19} />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-sm text-overlay-ink-muted leading-relaxed">{description}</p>
          {saveDisabled && saveHint && <p className="text-xs text-overlay-ink-muted mt-2 leading-relaxed">{saveHint}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 mt-7">
        <button
          onClick={onSave}
          disabled={saving || saveDisabled}
          className="w-full py-3 rounded-full text-sm font-medium text-overlay-surface bg-overlay-accent disabled:opacity-50"
        >
          {saving ? "Saving…" : saveLabel}
        </button>
        <button
          onClick={onDiscard}
          disabled={saving}
          className="w-full py-3 rounded-full bg-overlay-surface-raised text-sm font-medium text-overlay-danger disabled:opacity-50"
        >
          {discardLabel}
        </button>
        <button onClick={onKeepEditing} disabled={saving} className="w-full py-2.5 text-sm text-overlay-ink-muted disabled:opacity-50">
          Keep editing
        </button>
      </div>
    </Modal>
  );
}
