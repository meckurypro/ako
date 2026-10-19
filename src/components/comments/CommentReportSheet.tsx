// src/components/comments/CommentReportSheet.tsx
import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { Modal } from "../Modal";
import { useToast } from "../Toast";
import { useReportReasons, useSubmitReport } from "../../hooks/useReports";
import type { CommentWithAuthor } from "../../hooks/useComments";

export function CommentReportSheet({ comment, onClose }: { comment: CommentWithAuthor; onClose: () => void }) {
  const toast = useToast();
  const { data: reasons, isLoading: reasonsLoading } = useReportReasons();
  const submitReport = useSubmitReport();
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [details, setDetails] = useState("");

  async function handleSubmit() {
    if (!reasonId) return;
    try {
      await submitReport.mutateAsync({
        targetType: "comment",
        targetId: comment.id,
        reasonId,
        details,
      });
      toast("Report submitted. Thanks for flagging this.", { variant: "success" });
      onClose();
    } catch {
      toast("Couldn't submit your report. Try again.", { variant: "error" });
    }
  }

  return (
    <Modal onClose={onClose} ariaLabel="Report comment" maxWidthClass="max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <Flag size={18} className="text-danger" />
        <h2 className="font-display text-lg text-ink">Report comment</h2>
      </div>

      <p className="text-sm text-ink-muted mb-3 line-clamp-2">
        Reporting {comment.author.display_name}'s comment: "{comment.content}"
      </p>

      {reasonsLoading && <p className="text-ink-muted text-sm py-4 text-center">Loading reasons…</p>}

      <div className="space-y-1.5 mb-3">
        {reasons?.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setReasonId(r.id)}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl border ${
              reasonId === r.id ? "border-accent bg-accent-soft" : "border-border bg-canvas"
            }`}
          >
            <p className="text-sm font-medium text-ink">{r.label}</p>
            {r.description && <p className="text-xs text-ink-muted mt-0.5">{r.description}</p>}
          </button>
        ))}
      </div>

      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Add details (optional, required for 'Other')"
        rows={3}
        className="w-full bg-canvas border border-border rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted resize-none mb-3"
      />

      <button
        type="button"
        disabled={!reasonId || submitReport.isPending}
        onClick={() => void handleSubmit()}
        className="w-full flex items-center justify-center gap-2 bg-danger text-canvas rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {submitReport.isPending && <Loader2 size={16} className="animate-spin" />}
        Submit report
      </button>
    </Modal>
  );
}
