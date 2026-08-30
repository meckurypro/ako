import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { usePendingReports, useResolveReport, useDismissReport } from "../../hooks/useAdmin";

const ACTIONS = [
  { value: "content_removed", label: "Remove content" },
  { value: "account_warned", label: "Warn account" },
  { value: "account_restricted", label: "Restrict account" },
  { value: "account_suspended", label: "Suspend account" },
  { value: "account_banned", label: "Ban account" },
] as const;

export function AdminReports() {
  const navigate = useNavigate();
  const { data: reports, isLoading } = usePendingReports();
  const resolveReport = useResolveReport();
  const dismissReport = useDismissReport();

  const [actioningId, setActioningId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<typeof ACTIONS[number]["value"]>("content_removed");
  const [actionReason, setActionReason] = useState("");

  async function handleResolve(reportId: string, targetType: string, targetId: string) {
    await resolveReport.mutateAsync({
      reportId,
      targetType: targetType as "post" | "comment" | "profile",
      targetId,
      action: selectedAction,
      reason: actionReason || `Resolved via moderation queue: ${selectedAction}`,
    });
    setActioningId(null);
    setActionReason("");
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Moderation queue</h2>
        </div>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !reports || reports.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">Nothing pending. Queue is clear.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="bg-surface rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-accent bg-accent-soft px-2 py-0.5 rounded-full">
                    {report.reason.label}
                  </span>
                  <span className="text-xs text-ink-muted capitalize">{report.target_type}</span>
                </div>

                <p className="text-sm text-ink-muted mt-2">
                  Reported by <span className="text-ink font-medium">{report.reporter.display_name}</span>
                </p>

                {report.details && (
                  <p className="text-sm text-ink mt-1 bg-canvas rounded-lg p-2">"{report.details}"</p>
                )}

                <p className="text-xs text-ink-muted mt-2">
                  Target ID: <span className="font-mono">{report.target_id}</span>
                </p>

                {actioningId === report.id ? (
                  <div className="mt-3 pt-3 border-t border-border">
                    <select
                      value={selectedAction}
                      onChange={(e) => setSelectedAction(e.target.value as typeof selectedAction)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink mb-2"
                    >
                      {ACTIONS.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Reason (optional note)"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink mb-2"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolve(report.id, report.target_type, report.target_id)}
                        disabled={resolveReport.isPending}
                        className="flex-1 bg-accent text-canvas py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setActioningId(null)}
                        className="flex-1 bg-canvas text-ink-muted border border-border py-2 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setActioningId(report.id)}
                      className="flex-1 bg-accent text-canvas py-2 rounded-lg text-sm font-medium"
                    >
                      Take action
                    </button>
                    <button
                      onClick={() => dismissReport.mutate(report.id)}
                      disabled={dismissReport.isPending}
                      className="flex-1 bg-canvas text-ink-muted border border-border py-2 rounded-lg text-sm disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
