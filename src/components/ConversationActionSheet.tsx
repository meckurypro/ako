// src/components/ConversationActionSheet.tsx
import { Pin, PinOff, Archive, Trash2 } from "lucide-react";

interface ConversationActionSheetProps {
  displayName: string;
  isPinned: boolean;
  onTogglePin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * Long-press action sheet for a conversation row — pin/unpin to top,
 * archive, or delete (hides the chat for this user only; the other
 * participant's copy is untouched).
 */
export function ConversationActionSheet({
  displayName,
  isPinned,
  onTogglePin,
  onArchive,
  onDelete,
  onClose,
}: ConversationActionSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border pb-[env(safe-area-inset-bottom)]">
        <p className="px-4 pt-4 pb-2 text-xs text-ink-muted truncate">{displayName}</p>

        <button
          onClick={() => {
            onTogglePin();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-ink"
        >
          {isPinned ? <PinOff size={18} /> : <Pin size={18} />}
          {isPinned ? "Unpin from top" : "Pin to top"}
        </button>

        <button
          onClick={() => {
            onArchive();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-ink"
        >
          <Archive size={18} />
          Archive
        </button>

        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-red-600"
        >
          <Trash2 size={18} />
          Delete chat
        </button>

        <button onClick={onClose} className="w-full py-3.5 text-sm text-ink-muted border-t border-border mt-1">
          Cancel
        </button>
      </div>
    </div>
  );
}
