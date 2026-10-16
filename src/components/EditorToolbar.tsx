// src/components/EditorToolbar.tsx
// Save / Undo / Redo bar for creator editors (book chapters, course lessons).
import { Undo2, Redo2, Check } from "lucide-react";

export function EditorToolbar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSave,
  saving,
  dirty,
  canSave = true,
  saveLabel = "Save",
  onCancel,
}: {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  canSave?: boolean;
  saveLabel?: string;
  onCancel?: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo"
        title="Undo (Ctrl/⌘+Z)"
        className="p-1.5 rounded-lg border border-border text-ink disabled:opacity-30"
      >
        <Undo2 size={16} />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo"
        title="Redo (Ctrl/⌘+Shift+Z)"
        className="p-1.5 rounded-lg border border-border text-ink disabled:opacity-30"
      >
        <Redo2 size={16} />
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !canSave || !dirty}
        className="ml-1 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-canvas text-sm font-medium disabled:opacity-40"
      >
        {!dirty && !saving && <Check size={14} />}
        {saving ? "Saving…" : dirty ? saveLabel : "Saved"}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="text-sm text-ink-muted px-2 py-1.5">
          {dirty ? "Discard" : "Close"}
        </button>
      )}
    </div>
  );
}

/** Keyboard shortcuts for a form/textarea: Ctrl/⌘+Z, Ctrl/⌘+Shift+Z, Ctrl+Y, Ctrl/⌘+S. */
export function editorKeyHandler(h: { undo: () => void; redo: () => void; save: () => void }) {
  return (e: React.KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) { e.preventDefault(); h.undo(); }
    else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); h.redo(); }
    else if (k === "s") { e.preventDefault(); h.save(); }
  };
}
