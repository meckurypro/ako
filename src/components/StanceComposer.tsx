import { useState } from "react";
import { X } from "lucide-react";
import { useCreateComment } from "../hooks/useComments";
import type { Stance } from "../types/database";

const STANCE_CONFIG: Record<Stance, { label: string; prompt: string }> = {
  support: { label: "Support", prompt: "Add your reasoning or build on the argument." },
  disagree: { label: "Disagree", prompt: "Explain your position." },
  pushback: { label: "Pushback", prompt: "What would you question, qualify, or add?" },
};

interface StanceComposerProps {
  postId: string;
  stance: Stance;
  onClose: () => void;
  parentCommentId?: string;   // set when replying to a specific comment, not the post itself
}

export function StanceComposer({ postId, stance, onClose, parentCommentId }: StanceComposerProps) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createComment = useCreateComment(postId);
  const config = STANCE_CONFIG[stance];

  async function handleSubmit() {
    if (!content.trim()) return;
    setError(null);

    try {
      await createComment.mutateAsync({
        post_id: postId,
        content,
        stance,
        parent_comment_id: parentCommentId,
      });
      setContent("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post this.");
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center z-50 px-4">
      <div className="bg-canvas rounded-2xl w-full max-w-md p-5 mb-safe">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg text-ink">{config.label}</h3>
          <button onClick={onClose} className="text-ink-muted">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-ink-muted mb-3">{config.prompt}</p>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
          rows={4}
          autoFocus
          className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink resize-none
            focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
        />

        {error && <p className="text-danger text-sm mt-2">{error}</p>}

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-ink-muted">{content.length}/2000</span>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || createComment.isPending}
            className="bg-accent text-canvas px-5 py-2 rounded-full text-sm font-medium disabled:opacity-50"
          >
            {createComment.isPending ? "Posting…" : config.label}
          </button>
        </div>
      </div>
    </div>
  );
}
