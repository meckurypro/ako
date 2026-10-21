// src/components/ReshareSheet.tsx
import { useState } from "react";
import { Repeat2, PenSquare } from "lucide-react";
import { useCreateReshare } from "../hooks/usePosts";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { Modal } from "./Modal";
import { RepostEmbed } from "./RepostEmbed";
import { useToast } from "./Toast";
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
  const toast = useToast();

  // Base level — always on while the sheet is open. Back from the
  // "choose" step closes the whole sheet.
  useBackDismiss(onClose);
  // Second level — only pushed while in the "quote" step, so back
  // from there returns to "choose" instead of closing outright.
  useBackDismiss(() => setMode("choose"), mode === "quote");

  async function handleRepost() {
    setError(null);
    try {
      await createReshare.mutateAsync({ originalPostId: postId });
      onClose();
      toast("Reposted.", { variant: "success" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't repost this.");
    }
  }

  async function handleQuoteSubmit() {
    if (!caption.trim()) return;
    setError(null);
    try {
      await createReshare.mutateAsync({ originalPostId: postId, caption });
      onClose();
      toast("Posted.", { variant: "success" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post this.");
    }
  }

  // Both steps render in the shared centred Modal with its own back-dismiss switched off: this component already
  // manages two history levels itself (see above), and a second layer from Modal would double them up.
  if (mode === "choose") {
    return (
      <Modal onClose={onClose} title="Share post" backDismiss={false}>
        <div className="-mx-2">
          <button
            type="button"
            onClick={handleRepost}
            disabled={createReshare.isPending}
            className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left text-overlay-ink active:bg-overlay-surface-raised disabled:opacity-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center text-overlay-accent">
              <Repeat2 size={24} />
            </span>
            <span className="font-semibold">{createReshare.isPending ? "Reposting…" : "Repost"}</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("quote")}
            className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left text-overlay-ink active:bg-overlay-surface-raised"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center text-overlay-accent">
              <PenSquare size={24} />
            </span>
            <span className="font-semibold">Quote</span>
          </button>
        </div>

        {error && <p className="mt-2 text-sm text-overlay-danger">{error}</p>}
      </Modal>
    );
  }

  return (
    <Modal onClose={() => setMode("choose")} title="Quote post" backDismiss={false} themed maxWidthClass="max-w-md">
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        maxLength={1000}
        rows={4}
        autoFocus
        placeholder="Add a comment…"
        className="w-full resize-none rounded-xl border border-border bg-canvas px-4 py-3 text-ink transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
      />

      {/* Preview of the original, exactly as it'll appear embedded once posted */}
      <RepostEmbed source={source} />

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-ink-muted">{caption.length}/1000</span>
        <button
          onClick={handleQuoteSubmit}
          disabled={createReshare.isPending || !caption.trim()}
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-canvas transition-colors duration-150 disabled:opacity-50"
        >
          {createReshare.isPending ? "Posting…" : "Quote"}
        </button>
      </div>

      <div className="mt-3 flex justify-center">
        <button
          onClick={() => setMode("choose")}
          className="rounded-full border border-border px-6 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-canvas"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
