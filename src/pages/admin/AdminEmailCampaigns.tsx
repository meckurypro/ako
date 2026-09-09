// src/pages/admin/AdminEmailCampaigns.tsx
import { Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { useEmailCampaigns, type CampaignStatus } from "../../hooks/useAdminComms";

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: "bg-highlight text-ink-muted",
  scheduled: "bg-accent-soft text-accent",
  sending: "bg-accent-soft text-accent",
  sent: "bg-accent-soft text-accent",
  failed: "bg-danger/10 text-danger",
  paused: "bg-highlight text-ink-muted",
  cancelled: "bg-highlight text-ink-muted",
};

export function AdminEmailCampaigns() {
  const smartBack = useSmartBack();
  const { data: campaigns, isLoading } = useEmailCampaigns();

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink flex-1">Email campaigns</h2>
          <Link
            to="/admin/emails/campaigns/new"
            className="bg-accent text-canvas w-9 h-9 rounded-xl flex items-center justify-center"
          >
            <Plus size={18} />
          </Link>
        </div>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !campaigns || campaigns.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">No campaigns yet.</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => (
              <Link
                key={c.id}
                to={`/admin/emails/campaigns/${c.id}`}
                className="block bg-surface rounded-xl p-4 border border-border"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-ink">{c.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[c.status]}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-sm text-ink-muted truncate">{c.template?.subject}</p>
                <p className="text-xs text-ink-muted mt-1">
                  {c.schedule_type === "recurring"
                    ? `Recurring (${c.recurrence})`
                    : c.schedule_type === "scheduled"
                      ? c.send_at
                        ? `Scheduled for ${new Date(c.send_at).toLocaleString()}`
                        : "Scheduled"
                      : "Immediate"}
                  {c.status === "sent" && ` · ${c.sent_count} sent, ${c.failed_count} failed`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
