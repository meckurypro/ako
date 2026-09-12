import { useState } from "react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { ArrowLeft, Search, X } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { ToggleSwitch } from "../../components/admin/ToggleSwitch";
import {
  useAdminSearchSuggestibleAccounts,
  useAdminSuggestedProfilesList,
  useAddSuggestedProfile,
  useRemoveSuggestedProfile,
  useSetSuggestedProfileActive,
  useSetSuggestedProfilePriority,
} from "../../hooks/useAdmin";

export function AdminSuggestedProfiles() {
  const smartBack = useSmartBack();
  const [query, setQuery] = useState("");

  const { data: results, isLoading, isFetching } = useAdminSearchSuggestibleAccounts(query);
  const { data: suggested, isLoading: suggestedLoading } = useAdminSuggestedProfilesList();

  const addSuggested = useAddSuggestedProfile();
  const removeSuggested = useRemoveSuggestedProfile();
  const setActive = useSetSuggestedProfileActive();
  const setPriority = useSetSuggestedProfilePriority();

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Suggested profiles</h2>
        </div>

        <p className="text-xs text-ink-muted mb-4">
          Profiles marked here are eligible to appear in new-user onboarding's "Find your people"
          step. Admin curation is a ranking signal alongside interest overlap — it doesn't override
          relevance, so a strongly interest-matched profile can still outrank an admin-suggested one
          that shares nothing with the new user's picks.
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

        {query.trim().length > 1 && (
          <div className="mb-8">
            {isLoading || isFetching ? (
              <p className="text-ink-muted text-center py-6 text-sm">Searching…</p>
            ) : results?.length === 0 ? (
              <p className="text-ink-muted text-center py-6 text-sm">No accounts found.</p>
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
                      checked={account.is_suggested}
                      disabled={addSuggested.isPending || removeSuggested.isPending}
                      onChange={(checked) => {
                        if (checked) {
                          addSuggested.mutate(account.id);
                        } else {
                          removeSuggested.mutate(account.id);
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <h3 className="font-display text-sm text-ink-muted uppercase tracking-wide mb-3">
          Currently suggested
        </h3>

        {suggestedLoading ? (
          <p className="text-ink-muted text-center py-6 text-sm">Loading…</p>
        ) : !suggested || suggested.length === 0 ? (
          <p className="text-ink-muted text-center py-6 text-sm">No suggested profiles yet.</p>
        ) : (
          <div className="space-y-2">
            {suggested.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-3 bg-surface rounded-xl p-3 border border-border"
              >
                <Avatar src={row.profile.avatar_url} name={row.profile.display_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{row.profile.display_name}</p>
                  <p className="text-xs text-ink-muted truncate">@{row.profile.username}</p>
                </div>
                <input
                  type="number"
                  value={row.priority}
                  onChange={(e) =>
                    setPriority.mutate({ profileId: row.profile_id, priority: Number(e.target.value) || 0 })
                  }
                  className="w-14 text-center text-sm rounded-lg border border-border bg-canvas text-ink py-1"
                  title="Priority — higher ranks first among admin-suggested profiles"
                />
                <ToggleSwitch
                  checked={row.is_active}
                  disabled={setActive.isPending}
                  onChange={(checked) => setActive.mutate({ profileId: row.profile_id, isActive: checked })}
                />
                <button
                  onClick={() => removeSuggested.mutate(row.profile_id)}
                  disabled={removeSuggested.isPending}
                  className="text-ink-muted hover:text-danger"
                  title="Remove from suggested pool"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
