// src/pages/admin/AdminAccountReview.tsx
//
// Admin queue for the Incubation Account Review gate. Search is
// server-side (admin_list_pending_accounts), and approval is a single
// idempotent RPC — see useAccountReview.ts.
import { useState } from "react";
import { ArrowLeft, Search, Check, Loader2 } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { usePendingAccounts, useApproveAccount } from "../../hooks/useAccountReview";
import { Avatar } from "../../components/Avatar";

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function AdminAccountReview() {
  const smartBack = useSmartBack();
  const [search, setSearch] = useState("");
  const { data: pending, isLoading } = usePendingAccounts(search);
  const approve = useApproveAccount();
  const [approvingId, setApprovingId] = useState<string | null>(null);

  async function handleApprove(id: string) {
    setApprovingId(id);
    try {
      await approve.mutateAsync(id);
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Account review</h2>
        </div>
        <p className="text-sm text-ink-muted mb-4">
          {pending ? `${pending.length} pending` : "…"} — approve accounts to let them into Akọ. Keeping an
          account pending isn't a rejection; it just stays under review.
        </p>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or username…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-surface text-ink text-sm"
          />
        </div>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !pending || pending.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">
            {search ? "No pending accounts match that search." : "No accounts waiting for review."}
          </p>
        ) : (
          <div className="space-y-2">
            {pending.map((account) => (
              <div
                key={account.id}
                className="flex items-center gap-3 bg-surface rounded-xl border border-border p-3.5"
              >
                <Avatar src={account.avatar_url} name={account.display_name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{account.display_name}</p>
                  <p className="text-xs text-ink-muted truncate">
                    @{account.username} · Joined {formatJoined(account.created_at)}
                    {!account.onboarding_completed && " · Onboarding incomplete"}
                  </p>
                </div>
                <button
                  onClick={() => void handleApprove(account.id)}
                  disabled={approvingId === account.id}
                  className="flex items-center gap-1.5 bg-accent text-canvas text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-50 flex-shrink-0"
                >
                  {approvingId === account.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Approve
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
