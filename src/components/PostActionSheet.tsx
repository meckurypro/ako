// src/components/PostActionSheet.tsx
import { Pencil, Archive, RotateCcw, Trash2 } from "lucide-react";

interface PostActionSheetProps {
  canEdit: boolean;
  isArchived: boolean;
  onEdit: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * Bottom sheet for a post's own author — Edit / Archive / Delete.
 * Same chrome as ConversationActionSheet for consistency.
 */
export function PostActionSheet({
  canEdit,
  isArchived,
  onEdit,
  onToggleArchive,
  onDelete,
  onClose,
}: PostActionSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border pb-[env(safe-area-inset-bottom)]">
        {canEdit && (
          <button
            onClick={() => {
              onEdit();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-ink"
          >
            <Pencil size={18} />
            Edit
          </button>
        )}

        <button
          onClick={() => {
            onToggleArchive();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-ink"
        >
          {isArchived ? <RotateCcw size={18} /> : <Archive size={18} />}
          {isArchived ? "Unarchive" : "Archive"}
        </button>

        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-danger"
        >
          <Trash2 size={18} />
          Delete post
        </button>

        <button onClick={onClose} className="w-full py-3.5 text-sm text-ink-muted border-t border-border mt-1">
          Cancel
        </button>
      </div>
    </div>
  );
}
