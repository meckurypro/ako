// src/pages/admin/AutomationRulesPanel.tsx
// Global automation rules, shown on Admin > Automate posts. Today: reciprocity auto-follow. An enabled automated
// account follows another account once it has engaged with it at least N times and that account has engaged back at
// least M times. See supabase/ako_automation_reciprocity_follow.sql.
import { useEffect, useState } from "react";
import {
  RECIPROCITY_DEFAULTS,
  useReciprocityFollowLog,
  useReciprocityRule,
  useRunReciprocityFollowNow,
  useSaveReciprocityRule,
} from "../../hooks/useAutomationRules";
import { useToast } from "../../components/Toast";
import { friendlyError } from "../../lib/friendlyError";

function toCount(text: string): number | null {
  const n = Number(text);
  return Number.isInteger(n) && n >= 1 && n <= 100000 ? n : null;
}

export function AutomationRulesPanel() {
  const toast = useToast();
  const { data: rule } = useReciprocityRule();
  const { data: log = [] } = useReciprocityFollowLog();
  const save = useSaveReciprocityRule();
  const runNow = useRunReciprocityFollowNow();

  const [outgoing, setOutgoing] = useState(String(RECIPROCITY_DEFAULTS.outgoing_min));
  const [reciprocal, setReciprocal] = useState(String(RECIPROCITY_DEFAULTS.reciprocal_min));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rule) return;
    setOutgoing(String(rule.outgoing_min));
    setReciprocal(String(rule.reciprocal_min));
  }, [rule]);

  const enabled = rule?.enabled ?? RECIPROCITY_DEFAULTS.enabled;
  const outN = toCount(outgoing);
  const recN = toCount(reciprocal);
  const dirty = !!rule && (outgoing !== String(rule.outgoing_min) || reciprocal !== String(rule.reciprocal_min));

  async function persist(next: { enabled: boolean; outgoing_min: number; reciprocal_min: number }, message: string) {
    setError(null);
    try {
      await save.mutateAsync(next);
      toast(message);
    } catch (err) {
      setError(friendlyError(err, "Couldn't save the rule. Please try again."));
    }
  }

  async function handleSave() {
    if (outN === null || recN === null) {
      setError("Both numbers must be whole numbers from 1 to 100000.");
      return;
    }
    await persist({ enabled, outgoing_min: outN, reciprocal_min: recN }, "Rule saved.");
  }

  async function handleToggle() {
    await persist(
      { enabled: !enabled, outgoing_min: rule?.outgoing_min ?? RECIPROCITY_DEFAULTS.outgoing_min, reciprocal_min: rule?.reciprocal_min ?? RECIPROCITY_DEFAULTS.reciprocal_min },
      enabled ? "Rule turned off." : "Rule turned on.",
    );
  }

  async function handleRun() {
    setError(null);
    try {
      const r = await runNow.mutateAsync();
      toast(r.status === "disabled" ? "The rule is off." : `Checked ${r.checked ?? 0}, followed ${r.followed ?? 0}.`);
    } catch (err) {
      setError(friendlyError(err, "Couldn't run the rule. Please try again."));
    }
  }

  return (
    <section className="mb-6">
      <h3 className="text-sm font-medium text-ink mb-2">Rules for all automated accounts</h3>
      <div className="bg-surface rounded-xl p-3 border border-border">
        <div className="flex items-start gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-ink">Follow on reciprocity</p>
            <p className="text-xs text-ink-muted">
              An active automated account follows someone once it has engaged with them at least {outN ?? "N"} times and
              they have engaged back at least {recN ?? "M"} times. Likes, comments, replies, shares and gifts all count,
              each action once. It happens once per pair, and they don't need to follow first.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={enabled ? "Turn the rule off" : "Turn the rule on"}
            onClick={handleToggle}
            disabled={save.isPending || !rule}
            className={`relative w-12 h-7 rounded-full transition-colors disabled:opacity-50 shrink-0 ${enabled ? "bg-accent" : "bg-border"}`}
          >
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-canvas transition-all ${enabled ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="text-xs text-ink-muted">Engagements by the automated account</span>
            <input
              inputMode="numeric"
              value={outgoing}
              onChange={(e) => setOutgoing(e.target.value.replace(/[^0-9]/g, ""))}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-ink"
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink-muted">Engagements back from them</span>
            <input
              inputMode="numeric"
              value={reciprocal}
              onChange={(e) => setReciprocal(e.target.value.replace(/[^0-9]/g, ""))}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-ink"
            />
          </label>
        </div>

        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || save.isPending}
            className="flex-1 rounded-xl bg-cta text-white py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleRun}
            disabled={runNow.isPending || !enabled}
            className="rounded-xl border border-border text-ink py-2.5 px-4 text-sm disabled:opacity-50"
          >
            {runNow.isPending ? "Checking…" : "Check now"}
          </button>
        </div>
        <p className="text-xs text-ink-muted mt-2">Checked automatically every 10 minutes. Changes apply to the next check.</p>

        <p className="text-xs font-medium text-ink mt-4 mb-1">Recent follows from this rule</p>
        {log.length === 0 ? (
          <p className="text-xs text-ink-muted">None yet.</p>
        ) : (
          <ul className="space-y-1">
            {log.map((l) => (
              <li key={l.id} className="text-xs text-ink-muted">
                <span className="text-ink">@{l.follower?.username ?? "unknown"}</span> followed{" "}
                <span className="text-ink">@{l.following?.username ?? "unknown"}</span> ·{" "}
                {l.outgoing_count} out, {l.reciprocal_count} back ·{" "}
                {new Date(l.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
