// src/components/wallet/TxnAnalysisSheet.tsx
//
// "Analysis": where the money in / out of the chosen period went, by category. Counts successful (completed)
// transactions only — the same rule as the In / Out totals on the Transactions page.
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useBackDismiss } from "../../hooks/useBackDismiss";
import { Portal } from "../Portal";
import { formatUsd } from "../../lib/money";
import { txnMeta } from "../../lib/walletTxn";

type Flow = "out" | "in";

export function TxnAnalysisSheet({
  rows,
  periodLabel,
  onClose,
}: {
  rows: { type: string; amount: number | string; status: string }[];
  periodLabel: string;
  onClose: () => void;
}) {
  useBackDismiss(onClose);
  const [flow, setFlow] = useState<Flow>("out");

  const { totals, byCategory } = useMemo(() => {
    const sums = { in: 0, out: 0 };
    const cats: Record<Flow, Map<string, number>> = { in: new Map(), out: new Map() };
    for (const t of rows) {
      if (t.status !== "completed") continue;
      const amt = Number(t.amount);
      if (amt === 0) continue;
      const f: Flow = amt > 0 ? "in" : "out";
      sums[f] += Math.abs(amt);
      cats[f].set(t.type, (cats[f].get(t.type) ?? 0) + Math.abs(amt));
    }
    const sorted = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);
    return { totals: sums, byCategory: { in: sorted(cats.in), out: sorted(cats.out) } };
  }, [rows]);

  const list = byCategory[flow];
  const total = totals[flow];

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
        <div
          role="dialog"
          aria-label="Analysis"
          className="animate-ako-fade-up relative max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] border border-b-0 border-border bg-surface px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base font-medium text-ink">Analysis</p>
              <p className="text-xs text-ink-muted">{periodLabel}</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="text-ink-muted">
              <X size={22} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2" role="tablist" aria-label="Money out or in">
            {(["out", "in"] as const).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={flow === f}
                onClick={() => setFlow(f)}
                className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                  flow === f ? "border-accent/50 bg-accent-soft" : "border-border bg-canvas"
                }`}
              >
                <span className="block text-xs text-ink-muted">{f === "out" ? "Money out" : "Money in"}</span>
                <span className={`block text-lg font-semibold tabular-nums ${flow === f ? "text-accent" : "text-ink"}`}>
                  {f === "out" ? "-" : "+"}
                  {formatUsd(totals[f])}
                </span>
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-muted">
              No {flow === "out" ? "money out" : "money in"} in this period.
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              {list.map(([type, amount]) => {
                const meta = txnMeta(type);
                const Icon = meta.icon;
                const pct = total > 0 ? (amount / total) * 100 : 0;
                return (
                  <li key={type}>
                    <div className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.tint}`}>
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate text-sm text-ink">{meta.label}</p>
                          <p className="shrink-0 text-sm font-medium tabular-nums text-ink">{formatUsd(amount)}</p>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                          <span className="w-10 text-right text-xs tabular-nums text-ink-muted">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Portal>
  );
}
