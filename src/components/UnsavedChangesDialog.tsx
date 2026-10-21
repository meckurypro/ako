// src/components/UnsavedChangesDialog.tsx
// Shown when a creator tries to leave an editor with staged, unsaved changes.
import { Modal } from "./Modal";

export function UnsavedChangesDialog({
  saving,
  onSave,
  onDiscard,
  onStay,
}: {
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onStay: () => void;
}) {
  return (
    <Modal onClose={onStay} role="alertdialog" title="You have unsaved changes">
      <p className="text-sm text-overlay-ink-muted leading-relaxed">
        Moves, deletions and edits only take effect once you save. Leave now and they're lost.
      </p>
      <div className="flex flex-col gap-2 mt-6">
        <button
          onClick={onSave}
          disabled={saving}
          className="py-3 rounded-full text-sm font-medium bg-overlay-accent text-overlay-surface disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save and leave"}
        </button>
        <button
          onClick={onDiscard}
          disabled={saving}
          className="py-3 rounded-full text-sm font-medium bg-overlay-danger text-overlay-surface disabled:opacity-50"
        >
          Discard changes
        </button>
        <button onClick={onStay} className="py-3 rounded-full text-sm font-medium bg-overlay-surface-raised text-overlay-ink">
          Keep editing
        </button>
      </div>
    </Modal>
  );
}
