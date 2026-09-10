import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSmartBack } from "../../hooks/useSmartBack";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { ToggleSwitch } from "../../components/admin/ToggleSwitch";
import {
  useAdminProjectTypeSettings,
  useToggleProjectTypeActive,
  useToggleHideWhenIneligible,
  useAdminAccessRules,
  useUpdateAccessRule,
  type ProjectTypeAccessRule,
} from "../../hooks/useAdmin";
import { PROJECT_TYPE_LABELS, PROJECT_TYPE_OPTIONS, type ProjectType } from "../../hooks/useProjects";

// Local editable copy of one rule's three numbers, keyed by the
// project type it belongs to — lets each row have its own draft
// inputs without needing one useState per field per type.
function toDraft(rule: ProjectTypeAccessRule) {
  return {
    min_follower_count: String(rule.min_follower_count),
    min_account_age_days: String(rule.min_account_age_days),
    min_total_engagement: String(rule.min_total_engagement),
  };
}

function RuleFields({
  projectType,
  rule,
}: {
  projectType: ProjectType;
  rule: ProjectTypeAccessRule | undefined;
}) {
  const updateRule = useUpdateAccessRule();
  const [draft, setDraft] = useState(() => (rule ? toDraft(rule) : { min_follower_count: "0", min_account_age_days: "0", min_total_engagement: "0" }));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (rule) setDraft(toDraft(rule));
  }, [rule]);

  const isDirty =
    rule &&
    (draft.min_follower_count !== String(rule.min_follower_count) ||
      draft.min_account_age_days !== String(rule.min_account_age_days) ||
      draft.min_total_engagement !== String(rule.min_total_engagement));

  async function handleSave() {
    setSaved(false);
    await updateRule.mutateAsync({
      project_type: projectType,
      min_follower_count: Math.max(0, parseInt(draft.min_follower_count, 10) || 0),
      min_account_age_days: Math.max(0, parseInt(draft.min_account_age_days, 10) || 0),
      min_total_engagement: Math.max(0, parseInt(draft.min_total_engagement, 10) || 0),
    });
    setSaved(true);
  }

  return (
    <div className="bg-canvas rounded-lg p-3 space-y-3">
      <p className="text-xs text-ink-muted">
        Set to 0 for no restriction. A user must clear all three to create this project type.
      </p>

      <div>
        <label className="block text-xs font-medium text-ink-muted mb-1">Minimum followers</label>
        <input
          type="number"
          min={0}
          value={draft.min_follower_count}
          onChange={(e) => {
            setSaved(false);
            setDraft((d) => ({ ...d, min_follower_count: e.target.value }));
          }}
          className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-sm text-ink"
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
          className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-sm text-ink"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-muted mb-1">
          Minimum total engagement (likes + comments + shares + reactions + gifts, across all posts)
        </label>
        <input
          type="number"
          min={0}
          value={draft.min_total_engagement}
          onChange={(e) => {
            setSaved(false);
            setDraft((d) => ({ ...d, min_total_engagement: e.target.value }));
          }}
          className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-sm text-ink"
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

export function AdminProjectTypes() {
  const smartBack = useSmartBack();
  const { data: settings, isLoading: settingsLoading } = useAdminProjectTypeSettings();
  const { data: rules, isLoading: rulesLoading } = useAdminAccessRules();
  const toggleActive = useToggleProjectTypeActive();
  const toggleHideWhenIneligible = useToggleHideWhenIneligible();
  const [expandedType, setExpandedType] = useState<ProjectType | null>(null);

  const isLoading = settingsLoading || rulesLoading;

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Project types</h2>
        </div>

        <p className="text-xs text-ink-muted mb-4">
          Turn a project type off to hide it from every host's type picker app-wide. Expand a type to set
          the achievements a user needs before they can create one, even while it's on. These rules only
          ever affect who can create a project of that type — anyone can still view, buy, or use one that
          already exists. Need to clear a specific account regardless of these rules? Use{" "}
          <Link to="/admin/account-exemptions" className="text-accent">Account exemptions</Link>.
        </p>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <div className="space-y-2">
            {PROJECT_TYPE_OPTIONS.map((type) => {
              const setting = settings?.find((s) => s.project_type === type);
              const isActive = setting?.is_active ?? true;
              const hideWhenIneligible = setting?.hide_when_ineligible ?? false;
              const rule = rules?.find((r) => r.project_type === type);
              const isExpanded = expandedType === type;

              return (
                <div key={type} className="bg-surface rounded-xl p-3 border border-border">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedType(isExpanded ? null : type)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-ink-muted" />
                      ) : (
                        <ChevronRight size={16} className="text-ink-muted" />
                      )}
                      <span className={`font-medium ${isActive ? "text-ink" : "text-ink-muted"}`}>
                        {PROJECT_TYPE_LABELS[type]}
                      </span>
                    </button>
                    <ToggleSwitch
                      checked={isActive}
                      disabled={toggleActive.isPending}
                      onChange={(checked) => toggleActive.mutate({ project_type: type, is_active: checked })}
                    />
                  </div>

                  {isExpanded && (
                    <div className="mt-2 ml-4 space-y-3">
                      <div className="bg-canvas rounded-lg p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-ink">Hide from ineligible users</p>
                          <p className="text-xs text-ink-muted mt-0.5">
                            {hideWhenIneligible
                              ? "Users who don't qualify won't see this type in the picker at all."
                              : "Users who don't qualify still see this type, but can't create one until they do."}
                          </p>
                        </div>
                        <ToggleSwitch
                          checked={hideWhenIneligible}
                          disabled={toggleHideWhenIneligible.isPending}
                          onChange={(checked) =>
                            toggleHideWhenIneligible.mutate({ project_type: type, hide_when_ineligible: checked })
                          }
                        />
                      </div>

                      <RuleFields projectType={type} rule={rule} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
