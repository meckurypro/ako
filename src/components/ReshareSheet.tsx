// src/components/ReshareSheet.tsx
import { useState } from "react";
import { Repeat2, PenSquare } from "lucide-react";
import { useCreateReshare } from "../hooks/usePosts";
import { RepostEmbed } from "./RepostEmbed";
import type { RepostSource } from "../types/database";

interface ReshareSheetProps {
  postId: string;
  /** Preview of the post being reshared, shown in the quote composer step. */
  source: RepostSource;
  onClose: () => void;
}

/**
 * Step 1: choose Repost (no caption) or Quote (add a caption).
 * Repost fires immediately and closes. Quote drops into a caption
 * composer with the original embedded below, same as it'll render once
 * posted.
 */
export function ReshareSheet({ postId, source, onClose }: ReshareSheetProps) {
  const [mode, setMode] = useState<"choose" | "quote">("choose");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createReshare = useCreateReshare();

  async function handleRepost() {
    setError(null);
    try {
      await createReshare.mutateAsync({ originalPostId: postId });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't repost this.");
    }
  }

  async function handleQuoteSubmit() {
    setError(null);
    try {
      await createReshare.mutateAsync({ originalPostId: postId, caption });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post this.");
    }
  }

  if (mode === "choose") {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
        <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border pb-[env(safe-area-inset-bottom)]">
          <button
            onClick={handleRepost}
            disabled={createReshare.isPending}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-ink disabled:opacity-50"
          >
            <Repeat2 size={18} className="text-accent" />
            {createReshare.isPending ? "Reposting…" : "Repost"}
          </button>

          <button
            onClick={() => setMode("quote")}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-ink"
          >
            <PenSquare size={18} className="text-accent" />
            Quote
          </button>

          {error && <p className="text-danger text-sm px-4 pb-2">{error}</p>}

          <button onClick={onClose} className="w-full py-3.5 text-sm text-ink-muted border-t border-border mt-1">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center z-50 px-4">
      <div className="bg-canvas rounded-2xl w-full max-w-md mb-safe overflow-hidden border-t-4 border-accent">
        <div className="p-5">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={1000}
            rows={4}
            autoFocus
            placeholder="Add a comment…"
            className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink
              resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors duration-150"
          />

          {/* Preview of the original, exactly as it'll appear embedded once posted */}
          <RepostEmbed source={source} />

          {error && <p className="text-danger text-sm mt-2">{error}</p>}

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-ink-muted">{caption.length}/1000</span>
            <button
              onClick={handleQuoteSubmit}
              disabled={createReshare.isPending}
              className="px-5 py-2 rounded-full text-sm font-medium bg-accent text-canvas disabled:opacity-50 transition-colors duration-150"
            >
              {createReshare.isPending ? "Posting…" : "Quote"}
            </button>
          </div>

          <div className="flex justify-center mt-3">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-full text-sm font-medium text-ink-muted
                border border-border hover:bg-surface transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
