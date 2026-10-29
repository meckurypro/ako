// src/pages/admin/AdminFeedAccess.tsx
//
// Admin for Progressive Access. Each pathway is a row the database evaluates: any ONE met pathway
// unlocks the Feed for a pending account (Admin > Account review still approves by hand, and a
// manual "put on pending" is a hold that auto-unlock respects). Thresholds are plain numbers —
// change them here with no deploy.
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Search } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { useAdminSearchUsers } from "../../hooks/useAdminComms";
import { ToggleSwitch } from "../../components/admin/ToggleSwitch";
import { Button } from "../../components/Button";
import {
  PATHWAY_LABELS,
  useAdminFeedRules,
  useAdminUserFeedAccess,
  useDeleteFeedRule,
  useFeedMetrics,
  useSaveFeedRule,
  useSetAutoUnlockBlocked,
  type FeedMetric,
  type FeedRule,
  type FeedRuleCondition,
} from "../../hooks/useFeedAccess";

const OPS: FeedRuleCondition["op"][] = [">=", ">", "=", "<=", "<"];
const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-canvas text-ink text-sm";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
}

function RuleEditor({
  initial,
  metrics,
  isNew,
  onClose,
}: {
  initial: FeedRule;
  metrics: FeedMetric[];
  isNew: boolean;
  onClose: () => void;
}) {
  const [rule, setRule] = useState<FeedRule>(initial);
  const save = useSaveFeedRule();
  const del = useDeleteFeedRule();

  const setCond = (i: number, patch: Partial<FeedRuleCondition>) =>
    setRule({ ...rule, conditions: rule.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  const submit = () => {
    const key = isNew ? slugify(rule.name) : rule.key;
    if (key.length < 2) return;
    save.mutate({ ...rule, key }, { onSuccess: onClose });
  };

  return (
    <div className="bg-surface rounded-xl p-4 border border-accent space-y-3">
      <input className={inputCls} placeholder="Name" value={rule.name} onChange={(e) => setRule({ ...rule, name: e.target.value })} />
      <input
        className={inputCls}
        placeholder="One-line description shown to users"
        value={rule.description ?? ""}
        onChange={(e) => setRule({ ...rule, description: e.target.value })}
      />
      <div className="flex gap-2">
        <select className={inputCls} value={rule.pathway} onChange={(e) => setRule({ ...rule, pathway: e.target.value })}>
          {Object.entries(PATHWAY_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <select className={inputCls} value={rule.logic} onChange={(e) => setRule({ ...rule, logic: e.target.value as "AND" | "OR" })}>
          <option value="AND">All conditions (AND)</option>
          <option value="OR">Any condition (OR)</option>
        </select>
      </div>

      {rule.conditions.map((c, i) => (
        <div key={i} className="flex gap-2 items-center">
          <select className={inputCls} value={c.metric} onChange={(e) => setCond(i, { metric: e.target.value })}>
            {metrics.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
          <select className="px-2 py-2 rounded-lg border border-border bg-canvas text-ink text-sm" value={c.op} onChange={(e) => setCond(i, { op: e.target.value as FeedRuleCondition["op"] })}>
            {OPS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <input
            type="number"
            className="w-20 px-2 py-2 rounded-lg border border-border bg-canvas text-ink text-sm"
            value={c.value}
            onChange={(e) => setCond(i, { value: Number(e.target.value) })}
          />
          <button
            aria-label="Remove condition"
            className="text-ink-muted disabled:opacity-30"
            disabled={rule.conditions.length === 1}
            onClick={() => setRule({ ...rule, conditions: rule.conditions.filter((_, j) => j !== i) })}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        className="text-sm text-accent flex items-center gap-1"
        onClick={() =>
          setRule({ ...rule, conditions: [...rule.conditions, { metric: metrics[0]?.key ?? "account_age_days", op: ">=", value: 1 }] })
        }
      >
        <Plus size={14} /> Add condition
      </button>

      {save.isError && <p className="text-sm text-danger">{(save.error as Error).message}</p>}
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={submit} loading={save.isPending}>Save</Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
        {!isNew && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            loading={del.isPending}
            onClick={() => {
              if (window.confirm(`Delete "${rule.name}"? Accounts already unlocked keep their access.`)) {
                del.mutate(rule.key, { onSuccess: onClose });
              }
            }}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

function UserLookup() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: results } = useAdminSearchUsers(query);
  const { data: status, isLoading } = useAdminUserFeedAccess(selectedId);
  const block = useSetAutoUnlockBlocked();

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted mb-2 px-1">Check a user's progress</p>
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
      {!selectedId &&
        (results ?? []).slice(0, 6).map((u) => (
          <button key={u.id} onClick={() => setSelectedId(u.id)} className="block w-full text-left px-3 py-2 text-sm text-ink hover:bg-surface rounded-lg">
            {u.display_name} <span className="text-ink-muted">@{u.username}</span>
          </button>
        ))}
      {selectedId && isLoading && <p className="text-sm text-ink-muted">Loading…</p>}
      {selectedId && status && (
        <div className="bg-surface rounded-xl p-4 border border-border text-sm space-y-2">
          <p className="text-ink">
            Status: <span className="font-medium">{status.account_status}</span>
            {status.unlocked_by && <span className="text-ink-muted"> · unlocked by {status.unlocked_by}</span>}
          </p>
          {status.rules.map((r) => (
            <p key={r.key} className="text-ink-muted">
              {r.met ? "✓ " : ""}{r.name} — {Math.round(r.progress * 100)}%
              {r.conditions.length > 0 && ` (${r.conditions.map((c) => `${c.label}: ${c.current}/${c.required}`).join(", ")})`}
            </p>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-ink">Hold auto-unlock for this user</span>
            <ToggleSwitch
              checked={status.auto_unlock_blocked}
              disabled={block.isPending}
              onChange={(blocked) => block.mutate({ userId: selectedId, blocked })}
              ariaLabel="Hold auto-unlock"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminFeedAccess() {
  const smartBack = useSmartBack();
  const { data: rules, isLoading } = useAdminFeedRules();
  const { data: metrics } = useFeedMetrics();
  const save = useSaveFeedRule();
  const [editing, setEditing] = useState<string | "new" | null>(null);

  const blank: FeedRule = {
    key: "",
    name: "",
    description: "",
    pathway: "other",
    logic: "AND",
    conditions: [{ metric: "account_age_days", op: ">=", value: 1 }],
    enabled: true,
    sort_order: (rules?.length ?? 0) * 10 + 10,
  };

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={smartBack} className="text-ink-muted" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Feed access pathways</h2>
        </div>
        <p className="text-sm text-ink-muted mb-6">
          Meeting any ONE enabled pathway unlocks the Feed for a pending account, checked every 10 minutes and whenever the
          person opens their progress. You can still approve anyone by hand in Account review. Switch the whole system on or
          off under Feature flags.
        </p>

        {isLoading || !metrics ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <div className="space-y-3">
            {(rules ?? []).map((r) =>
              editing === r.key ? (
                <RuleEditor key={r.key} initial={r} metrics={metrics} isNew={false} onClose={() => setEditing(null)} />
              ) : (
                <div key={r.key} className="bg-surface rounded-xl p-4 border border-border flex items-start justify-between gap-3">
                  <button className="text-left flex-1" onClick={() => setEditing(r.key)}>
                    <p className="font-medium text-ink">{r.name}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {PATHWAY_LABELS[r.pathway] ?? r.pathway} ·{" "}
                      {r.conditions
                        .map((c) => `${metrics.find((m) => m.key === c.metric)?.label ?? c.metric} ${c.op} ${c.value}`)
                        .join(r.logic === "OR" ? " OR " : " AND ")}
                    </p>
                  </button>
                  <ToggleSwitch
                    checked={r.enabled}
                    disabled={save.isPending}
                    onChange={(enabled) => save.mutate({ ...r, enabled })}
                    ariaLabel={`Enable ${r.name}`}
                  />
                </div>
              )
            )}

            {editing === "new" ? (
              <RuleEditor initial={blank} metrics={metrics} isNew onClose={() => setEditing(null)} />
            ) : (
              <button className="text-sm text-accent flex items-center gap-1 pt-1" onClick={() => setEditing("new")}>
                <Plus size={14} /> New pathway
              </button>
            )}
          </div>
        )}

        <div className="mt-10">
          <UserLookup />
        </div>
      </div>
    </div>
  );
}
