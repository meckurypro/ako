import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { useAdminReportReasons, useCreateReportReason, useToggleReportReasonActive } from "../../hooks/useAdmin";

export function AdminReportReasons() {
  const navigate = useNavigate();
  const { data: reasons, isLoading } = useAdminReportReasons();
  const createReason = useCreateReportReason();
  const toggleActive = useToggleReportReasonActive();

  const [label, setLabel] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;

    const maxSortOrder = Math.max(0, ...(reasons?.map((r) => r.sort_order) ?? [0]));
    await createReason.mutateAsync({ label: label.trim(), sort_order: maxSortOrder + 1 });
    setLabel("");
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Report reasons</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="New reason"
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-surface text-ink"
          />
          <button
            type="submit"
            disabled={createReason.isPending}
            className="bg-accent text-canvas px-4 rounded-xl flex items-center justify-center disabled:opacity-50"
          >
            <Plus size={18} />
          </button>
        </form>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <div className="space-y-2">
            {reasons?.map((reason) => (
              <div
                key={reason.id}
                className="flex items-center justify-between bg-surface rounded-xl p-3 border border-border"
              >
                <span className={`font-medium ${reason.is_active ? "text-ink" : "text-ink-muted line-through"}`}>
                  {reason.label}
                </span>
                <button
                  onClick={() => toggleActive.mutate({ id: reason.id, is_active: !reason.is_active })}
                  className="text-xs text-accent font-medium"
                >
                  {reason.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
