// src/pages/admin/AdminAccountReview.tsx
//
// Admin queue for the Incubation Account Review gate. Search is
// server-side (admin_list_pending_accounts), and approval is a single
// idempotent RPC — see useAccountReview.ts.
import { useState } from "react";
import { ArrowLeft, Search, Check, Loader2, UserX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSmartBack } from "../../hooks/useSmartBack";
import { usePendingAccounts, useApproveAccount, useSetAccountPending } from "../../hooks/useAccountReview";
import { useAdminSearchUsers } from "../../hooks/useAdminComms";
import { Avatar } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { supabase } from "../../lib/supabase";

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ------------------------------------------------------------
// Search any user (any status) and move them to pending — the
// inverse of approving. Mirrors AdminVerifiedUsers' individual
// search-and-assign pattern.
// ------------------------------------------------------------
function SetUserPending() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: results, isFetching } = useAdminSearchUsers(query);
  const setPending = useSetAccountPending();

  const { data: selectedProfile, isLoading: loadingSelected } = useQuery({
    queryKey: ["admin-set-pending-selected-profile", selectedId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, account_status")
        .eq("id", selectedId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedId,
  });

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted mb-2 px-1">
        Put a user on pending
      </p>
      <div className="relative mb-2">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedId(null);
          }}
          placeholder="Search by username or name…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-surface text-ink text-sm"
        />
      </div>

      {!selectedId && (
        <>
          {isFetching && <p className="text-xs text-ink-muted mb-1">Searching…</p>}
          <div className="space-y-1">
            {(results ?? []).map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedId(u.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-surface text-left text-sm"
              >
                <Avatar src={u.avatar_url} name={u.display_name} size="sm" />
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{u.display_name}</span>
                  <span className="block text-xs text-ink-muted truncate">@{u.username}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {selectedId && (
        <div className="bg-surface rounded-xl border border-border p-4 mt-2">
          {loadingSelected || !selectedProfile ? (
            <p className="text-ink-muted text-sm">Loading…</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Avatar src={selectedProfile.avatar_url} name={selectedProfile.display_name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink">{selectedProfile.display_name}</p>
                  <p className="text-xs text-ink-muted">
                    @{selectedProfile.username} · {selectedProfile.account_status}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  loading={setPending.isPending}
                  disabled={selectedProfile.account_status === "pending"}
                  onClick={() => setPending.mutate(selectedProfile.id)}
                >
                  <UserX size={14} className="mr-1.5" />
                  {selectedProfile.account_status === "pending" ? "Already pending" : "Set to pending"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>
                  Back to search
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
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

        <div className="mt-8 pt-6 border-t border-border">
          <SetUserPending />
        </div>
      </div>
    </div>
  );
}
