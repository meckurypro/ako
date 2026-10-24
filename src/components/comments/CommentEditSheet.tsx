// src/components/comments/CommentEditSheet.tsx
import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Modal } from "../Modal";
import { useToast } from "../Toast";
import { useUpdateComment, type CommentWithAuthor } from "../../hooks/useComments";
import { friendlyError } from "../../lib/friendlyError";

const COMMENT_LIMIT = 2000; // matches create-comment / update-comment

export function CommentEditSheet({ comment, onClose }: { comment: CommentWithAuthor; onClose: () => void }) {
  const toast = useToast();
  const update = useUpdateComment(comment.post_id);
  const [text, setText] = useState(comment.content);
  const [error, setError] = useState<string | null>(null);

  const trimmed = text.trim();
  const canSave = trimmed.length > 0 && trimmed.length <= COMMENT_LIMIT && trimmed !== comment.content.trim();

  async function handleSave() {
    if (!canSave) return;
    setError(null);
    try {
      await update.mutateAsync({ comment_id: comment.id, content: trimmed });
      toast("Comment updated.", { variant: "success" });
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Couldn't save your edit."));
    }
  }

  return (
    <Modal onClose={onClose} ariaLabel="Edit comment" maxWidthClass="max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <Pencil size={18} className="text-ink" />
        <h2 className="font-display text-lg text-ink">Edit comment</h2>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        maxLength={COMMENT_LIMIT}
        autoFocus
        className="w-full bg-canvas border border-border rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted resize-none mb-2"
      />

      <p className="text-xs text-ink-muted mb-3">You can edit until someone likes, replies to, or gifts this comment.</p>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      <button
        type="button"
        disabled={!canSave || update.isPending}
        onClick={() => void handleSave()}
        className="w-full flex items-center justify-center gap-2 bg-accent text-canvas rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {update.isPending && <Loader2 size={16} className="animate-spin" />}
        Save
      </button>
    </Modal>
  );
}
