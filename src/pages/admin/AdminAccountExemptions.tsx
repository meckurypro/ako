import { useState } from "react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { ArrowLeft, Search } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { ToggleSwitch } from "../../components/admin/ToggleSwitch";
import {
  useAdminSearchAccounts,
  useGrantProjectTypeExemption,
  useRevokeProjectTypeExemption,
} from "../../hooks/useAdmin";

export function AdminAccountExemptions() {
  const smartBack = useSmartBack();
  const [query, setQuery] = useState("");
  const { data: results, isLoading, isFetching } = useAdminSearchAccounts(query);
  const grantExemption = useGrantProjectTypeExemption();
  const revokeExemption = useRevokeProjectTypeExemption();

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Account exemptions</h2>
        </div>

        <p className="text-xs text-ink-muted mb-4">
          Exempting an account lets it create any project type without meeting the follower, account-age,
          or engagement rules set under Project types. A type that's switched off entirely still stays off
          for exempted accounts.
        </p>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or name…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-ink"
          />
        </div>

        {query.trim().length <= 1 ? (
          <p className="text-ink-muted text-center py-10 text-sm">Type at least 2 characters to search.</p>
        ) : isLoading || isFetching ? (
          <p className="text-ink-muted text-center py-10">Searching…</p>
        ) : results?.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">No accounts found.</p>
        ) : (
          <div className="space-y-2">
            {results?.map((account) => (
              <div
                key={account.id}
                className="flex items-center gap-3 bg-surface rounded-xl p-3 border border-border"
              >
                <Avatar src={account.avatar_url} name={account.display_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{account.display_name}</p>
                  <p className="text-xs text-ink-muted truncate">
                    @{account.username} · {account.follower_count} followers
                  </p>
                </div>
                <ToggleSwitch
                  checked={account.is_exempt}
                  disabled={grantExemption.isPending || revokeExemption.isPending}
                  onChange={(checked) => {
                    if (checked) {
                      grantExemption.mutate(account.id);
                    } else {
                      revokeExemption.mutate(account.id);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
