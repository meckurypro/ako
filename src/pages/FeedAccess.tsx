// src/pages/FeedAccess.tsx
//
// "Progressive Access" — where an account sees exactly what it takes to earn the Feed, by what it
// came to Akọ to do. Pathways are alternatives (any ONE unlocks); the conditions inside a pathway
// follow that pathway's AND / OR. Everything shown here is computed by the database.
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import {
  closestPathway,
  PATHWAY_LABELS,
  useMyFeedAccess,
  type FeedCondition,
  type FeedPathwayState,
} from "../hooks/useFeedAccess";

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function ConditionRow({ c, logic }: { c: FeedCondition; logic: "AND" | "OR" }) {
  const pct = c.required > 0 ? Math.min(100, Math.round((c.current / c.required) * 100)) : c.met ? 100 : 0;
  return (
    <div className="mt-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-muted">
          {logic === "OR" ? "Either: " : ""}
          {c.label}
        </span>
        <span className={c.met ? "text-accent font-medium" : "text-ink-muted"}>
          {fmt(Math.min(c.current, c.required))} / {fmt(c.required)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-border mt-1 overflow-hidden">
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PathwayCard({ rule }: { rule: FeedPathwayState }) {
  return (
    <div className={`bg-surface rounded-xl p-4 border ${rule.met ? "border-accent" : "border-border"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{rule.name}</p>
          {rule.description && <p className="text-sm text-ink-muted mt-0.5">{rule.description}</p>}
        </div>
        {rule.met && <Check size={18} className="text-accent shrink-0 mt-0.5" />}
      </div>
      {rule.conditions.map((c) => (
        <ConditionRow key={c.metric + c.op + c.required} c={c} logic={rule.logic} />
      ))}
    </div>
  );
}

export function FeedAccess() {
  const smartBack = useSmartBack();
  const { data, isLoading, isError } = useMyFeedAccess();

  const grouped = new Map<string, FeedPathwayState[]>();
  for (const r of data?.rules ?? []) {
    grouped.set(r.pathway, [...(grouped.get(r.pathway) ?? []), r]);
  }
  const next = data && !data.has_feed_access ? closestPathway(data.rules) : null;

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={smartBack} className="text-ink-muted" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Feed access</h2>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16 text-ink-muted">
            <Loader2 className="animate-spin" />
          </div>
        )}
        {isError && <p className="text-sm text-ink-muted py-10 text-center">Couldn't load this right now.</p>}

        {data?.has_feed_access && (
          <div className="bg-surface rounded-xl p-4 border border-border mt-4">
            <p className="font-medium text-ink">The Feed is open to you</p>
            <p className="text-sm text-ink-muted mt-1">
              {data.unlocked_by?.startsWith("rule:")
                ? "You earned it through your activity on Akọ."
                : "Your account has full access."}
            </p>
            <Link to="/feed" className="inline-block text-sm font-medium text-accent mt-3">
              Go to the Feed
            </Link>
          </div>
        )}

        {data && !data.has_feed_access && (
          <>
            <p className="text-sm text-ink-muted mt-1 mb-5">
              The Feed opens as you take part. Pick whichever path fits why you're here — completing any one of
              them unlocks it.
            </p>

            {next && next.progress > 0 && (
              <p className="text-sm text-ink mb-5">
                You're closest on <span className="font-medium">{next.name}</span> —{" "}
                {Math.round(next.progress * 100)}% there.
              </p>
            )}

            {data.auto_unlock_blocked && (
              <p className="text-sm text-ink-muted mb-5">
                Your access is being reviewed by the Akọ team, so it won't unlock automatically.
              </p>
            )}
            {!data.progressive_enabled && !data.auto_unlock_blocked && (
              <p className="text-sm text-ink-muted mb-5">Automatic unlocking is paused right now.</p>
            )}

            <div className="space-y-6">
              {[...grouped.entries()].map(([pathway, rules]) => (
                <div key={pathway}>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted mb-2 px-1">
                    {PATHWAY_LABELS[pathway] ?? pathway}
                  </p>
                  <div className="space-y-3">
                    {rules.map((r) => (
                      <PathwayCard key={r.key} rule={r} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
