import { useEffect, useState } from "react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { ArrowLeft, Search } from "lucide-react";
import { ToggleSwitch } from "../../components/admin/ToggleSwitch";
import { Avatar } from "../../components/Avatar";
import {
  usePagesFeatureSettings,
  useTogglePagesEnabled,
  useAdminPageCreationRule,
  useUpdatePageCreationRule,
  useAdminSearchAccountsForPageCapability,
  useGrantPageCreationOverride,
  useRevokePageCreationOverride,
  type PageCreationRule,
} from "../../hooks/useAdmin";
import { useFeatureFlag, useToggleFeatureFlag } from "../../hooks/useFeatureFlags";

function toDraft(rule: PageCreationRule) {
  return {
    min_posts_30d: String(rule.min_posts_30d),
    min_distinct_engaged_posts_30d: String(rule.min_distinct_engaged_posts_30d),
    min_account_age_days: String(rule.min_account_age_days),
  };
}

// Editable copy of the create_page rule's numbers, plus its own
// is_active switch — same "local draft + Save" pattern as
// AdminProjectTypes' RuleFields.
function PageRuleFields({ rule }: { rule: PageCreationRule | null | undefined }) {
  const updateRule = useUpdatePageCreationRule();
  const [draft, setDraft] = useState(() =>
    rule ? toDraft(rule) : { min_posts_30d: "30", min_distinct_engaged_posts_30d: "30", min_account_age_days: "0" }
  );
  const [isActive, setIsActive] = useState(rule?.is_active ?? true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (rule) {
      setDraft(toDraft(rule));
      setIsActive(rule.is_active);
    }
  }, [rule]);

  const isDirty =
    !!rule &&
    (draft.min_posts_30d !== String(rule.min_posts_30d) ||
      draft.min_distinct_engaged_posts_30d !== String(rule.min_distinct_engaged_posts_30d) ||
      draft.min_account_age_days !== String(rule.min_account_age_days) ||
      isActive !== rule.is_active);

  async function handleSave() {
    setSaved(false);
    await updateRule.mutateAsync({
      min_posts_30d: Math.max(0, parseInt(draft.min_posts_30d, 10) || 0),
      min_distinct_engaged_posts_30d: Math.max(0, parseInt(draft.min_distinct_engaged_posts_30d, 10) || 0),
      min_account_age_days: Math.max(0, parseInt(draft.min_account_age_days, 10) || 0),
      is_active: isActive,
    });
    setSaved(true);
  }

  return (
    <div className="bg-surface rounded-xl p-4 border border-border space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">Enforce eligibility rule</p>
          <p className="text-xs text-ink-muted mt-0.5">
            {isActive
              ? "A user must clear both requirements below to create a page."
              : "Rule is off — falls back to the safe default (30 / 30) rather than opening the gate. Turn on to use the numbers below instead."}
          </p>
        </div>
        <ToggleSwitch
          checked={isActive}
          disabled={updateRule.isPending}
          onChange={(checked) => {
            setSaved(false);
            setIsActive(checked);
          }}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-muted mb-1">Minimum posts in the last 30 days</label>
        <input
          type="number"
          min={0}
          value={draft.min_posts_30d}
          onChange={(e) => {
            setSaved(false);
            setDraft((d) => ({ ...d, min_posts_30d: e.target.value }));
          }}
          className="w-full px-3 py-1.5 rounded-lg border border-border bg-canvas text-sm text-ink"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-muted mb-1">
          Minimum distinct posts engaged with in the last 30 days
        </label>
        <p className="text-xs text-ink-muted mb-1">
          Counts reactions, comments, bookmarks, and reshares — deduped per post. Own posts, and anything done
          while acting as a Page, don't count toward
          this.
        </p>
        <input
          type="number"
          min={0}
          value={draft.min_distinct_engaged_posts_30d}
          onChange={(e) => {
            setSaved(false);
            setDraft((d) => ({ ...d, min_distinct_engaged_posts_30d: e.target.value }));
          }}
          className="w-full px-3 py-1.5 rounded-lg border border-border bg-canvas text-sm text-ink"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-muted mb-1">Minimum account age (days)</label>
        <input
          type="number"
          min={0}
          value={draft.min_account_age_days}
          onChange={(e) => {
            setSaved(false);
            setDraft((d) => ({ ...d, min_account_age_days: e.target.value }));
          }}
          className="w-full px-3 py-1.5 rounded-lg border border-border bg-canvas text-sm text-ink"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || updateRule.isPending}
          className="bg-accent text-canvas px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {updateRule.isPending ? "Saving…" : "Save rule"}
        </button>
        {saved && !isDirty && <span className="text-xs text-ink-muted">Saved.</span>}
      </div>
    </div>
  );
}

// Capability-scoped override search — deliberately separate from
// /admin/account-exemptions, which grants a blanket pass on every
// project-type rule at once. An override granted here only ever
// affects create_page, nothing else.
//
// Each row keeps its own draft expiry date (yyyy-mm-dd, or "" for no
// expiry/forever) so an admin can set how long a test grant should
// last before flipping the switch on. Toggling off always revokes
// immediately regardless of what expiry was set.
function PageCapabilityOverrides() {
  const [query, setQuery] = useState("");
  const { data: results, isLoading, isFetching } = useAdminSearchAccountsForPageCapability(query);
  const grant = useGrantPageCreationOverride();
  const revoke = useRevokePageCreationOverride();
  const [expiryDrafts, setExpiryDrafts] = useState<Record<string, string>>({});

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-ink">Test overrides</p>
        <p className="text-xs text-ink-muted mt-0.5">
          Grants a specific account create_page access regardless of the rule above — for testing only. Doesn't
          touch their actual post/engagement counts, and doesn't affect any other creation rule.
        </p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or name…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-canvas text-ink text-sm"
        />
      </div>

      {query.trim().length <= 1 ? (
        <p className="text-ink-muted text-center py-6 text-sm">Type at least 2 characters to search.</p>
      ) : isLoading || isFetching ? (
        <p className="text-ink-muted text-center py-6 text-sm">Searching…</p>
      ) : results?.length === 0 ? (
        <p className="text-ink-muted text-center py-6 text-sm">No accounts found.</p>
      ) : (
        <div className="space-y-2">
          {results?.map((account) => {
            const draftExpiry = expiryDrafts[account.id] ?? "";
            return (
              <div key={account.id} className="bg-canvas rounded-xl p-3 border border-border space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar src={account.avatar_url} name={account.display_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink truncate text-sm">{account.display_name}</p>
                    <p className="text-xs text-ink-muted truncate">
                      @{account.username} · {account.follower_count} followers
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={account.has_page_override}
                    disabled={grant.isPending || revoke.isPending}
                    onChange={(checked) => {
                      if (checked) {
                        grant.mutate({
                          targetUserId: account.id,
                          expiresAt: draftExpiry ? new Date(draftExpiry).toISOString() : null,
                        });
                      } else {
                        revoke.mutate(account.id);
                      }
                    }}
                  />
                </div>

                {account.has_page_override ? (
                  <p className="text-xs text-ink-muted pl-11">
                    {account.override_expires_at
                      ? `Expires ${new Date(account.override_expires_at).toLocaleDateString()}`
                      : "No expiry — active until manually revoked"}
                  </p>
                ) : (
                  <div className="flex items-center gap-2 pl-11">
                    <label className="text-xs text-ink-muted whitespace-nowrap">Expires (optional):</label>
                    <input
                      type="date"
                      value={draftExpiry}
                      onChange={(e) => setExpiryDrafts((d) => ({ ...d, [account.id]: e.target.value }))}
                      className="px-2 py-1 rounded-lg border border-border bg-surface text-xs text-ink"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// /admin/page-settings — site-wide on/off switch for standing up new
// organisation, brand, or product pages, plus the eligibility rule
// (30 posts / 30 distinct engaged posts in the last 30 days by
// default), capability-scoped test overrides for create_page, and two
// narrower page-domain switches (subsidiary creation, page messaging)
// — see useFeatureFlags.ts for those two and /admin/feature-flags for
// the rest of the app's flags (wallet, promotions, affiliates).
// Turning the top switch off hides the "Page" row in the profile
// owner menu, the "+ create a page" row in the account-mode switcher,
// and blocks /pages/new directly. Pages that already exist, and
// switching into/acting as one, are unaffected either way.
export function AdminPageSettings() {
  const smartBack = useSmartBack();
  const { data: settings, isLoading } = usePagesFeatureSettings();
  const toggle = useTogglePagesEnabled();
  const { data: rule, isLoading: ruleLoading } = useAdminPageCreationRule();
  // Two narrower switches alongside the main one above — see
  // useFeatureFlags.ts. Kept on this page rather than a separate admin
  // screen since they're both still squarely page-domain settings.
  const subsidiariesEnabled = useFeatureFlag("subsidiaries_enabled");
  const pageMessagingEnabled = useFeatureFlag("page_messaging_enabled");
  const toggleFlag = useToggleFeatureFlag();

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Page settings</h2>
        </div>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ink">Allow new pages</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  When on, anyone who meets the eligibility rule below can stand up a new organisation, brand,
                  or product page. Turning this off hides the "create a page" entry points and blocks the
                  /pages/new form directly — pages that already exist, and switching into them, keep working
                  as normal either way.
                </p>
              </div>
              <ToggleSwitch
                checked={settings?.pages_creation_enabled ?? true}
                disabled={toggle.isPending}
                onChange={(checked) => toggle.mutate(checked)}
              />
            </div>
          </div>
        )}

        <div className="bg-surface rounded-xl border border-border divide-y divide-border">
          <div className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-ink">Subsidiary creation</p>
              <p className="text-xs text-ink-muted mt-0.5">
                The "Add Subsidiary" row on an organisation page's "…" menu, and /pages/new when arrived at that
                way. Independent of "Allow new pages" above — existing subsidiary relationships are unaffected
                either way.
              </p>
            </div>
            <ToggleSwitch
              checked={subsidiariesEnabled}
              disabled={toggleFlag.isPending}
              onChange={(checked) => toggleFlag.mutate({ key: "subsidiaries_enabled", enabled: checked })}
            />
          </div>
          <div className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-ink">Page messaging</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Page inbox / page-to-profile direct messages. Existing threads stay readable either way.
              </p>
            </div>
            <ToggleSwitch
              checked={pageMessagingEnabled}
              disabled={toggleFlag.isPending}
              onChange={(checked) => toggleFlag.mutate({ key: "page_messaging_enabled", enabled: checked })}
            />
          </div>
        </div>

        {ruleLoading ? (
          <p className="text-ink-muted text-center py-6">Loading rule…</p>
        ) : (
          <PageRuleFields rule={rule} />
        )}

        <div className="bg-surface rounded-xl p-4 border border-border">
          <PageCapabilityOverrides />
        </div>
      </div>
    </div>
  );
}
