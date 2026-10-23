// src/pages/WalletTransactions.tsx
//
// The full transaction history, one tap from the Wallet. Grouped under day headings; filter by direction and period.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useWalletTransactions } from "../hooks/useWallet";
import { BottomNav } from "../components/BottomNav";
import { formatUsd } from "../lib/money";
import { txnMeta } from "../lib/walletTxn";
import { WALLET_PERIODS, inPeriod, type WalletPeriod } from "../lib/walletPeriod";

// Activity is grouped under day headings ("Today", "Yesterday", "Oct 18") instead of repeating a date on every line.
function dayLabel(dateString: string): string {
  const d = new Date(dateString);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function txnTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

type Direction = "all" | "in" | "out";
const DIRECTIONS: { id: Direction; label: string }[] = [
  { id: "all", label: "All" },
  { id: "in", label: "In" },
  { id: "out", label: "Out" },
];

export function WalletTransactionsPage() {
  const { data: transactions, isLoading } = useWalletTransactions();
  const [direction, setDirection] = useState<Direction>("all");
  const [period, setPeriod] = useState<WalletPeriod>("all");

  // Period first, so the in/out summary reflects the chosen range regardless of the direction filter.
  const periodRows = useMemo(
    () => ((transactions as any[] | undefined) ?? []).filter((t) => inPeriod(t.created_at, period)),
    [transactions, period],
  );

  const summary = useMemo(() => {
    let moneyIn = 0;
    let moneyOut = 0;
    for (const t of periodRows) {
      const amt = Number(t.amount);
      if (amt >= 0) moneyIn += amt;
      else moneyOut += -amt;
    }
    return { moneyIn, moneyOut };
  }, [periodRows]);

  const groups = useMemo(() => {
    const rows = periodRows.filter((t) => {
      const amt = Number(t.amount);
      return direction === "all" ? true : direction === "in" ? amt >= 0 : amt < 0;
    });
    const out: { label: string; rows: any[] }[] = [];
    for (const t of rows) {
      const label = dayLabel(t.created_at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.rows.push(t);
      else out.push({ label, rows: [t] });
    }
    return out;
  }, [periodRows, direction]);

  return (
    <div className="min-h-screen bg-canvas pb-28">
      <div className="max-w-xl md:max-w-3xl mx-auto px-4 md:px-8 pt-5 md:pt-10">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/wallet" className="inline-flex text-ink-muted" aria-label="Back to wallet">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-display text-xl text-ink">Transactions</h1>
        </div>

        <div className="flex items-center gap-2 mb-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Filter by direction">
          {DIRECTIONS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={direction === f.id}
              onClick={() => setDirection(f.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm border transition-colors ${
                direction === f.id ? "bg-cta text-white border-cta" : "bg-surface text-ink border-border hover:border-accent/50"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="w-px h-5 bg-border mx-1 shrink-0" aria-hidden="true" />
          {WALLET_PERIODS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={period === p.id}
              onClick={() => setPeriod(p.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                period === p.id
                  ? "bg-accent-soft text-accent border-accent/40 font-medium"
                  : "bg-transparent text-ink-muted border-border hover:border-accent/50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {periodRows.length > 0 && (
          <p className="text-xs text-ink-muted mb-4 px-1 tabular-nums">
            In <span className="text-accent font-medium">+{formatUsd(summary.moneyIn)}</span> · Out{" "}
            <span className="text-ink font-medium">-{formatUsd(summary.moneyOut)}</span>
          </p>
        )}

        {isLoading ? null : groups.length === 0 ? (
          <p className="text-center text-ink-muted text-sm py-12">
            {transactions && transactions.length > 0 ? "Nothing here." : "No transactions yet."}
          </p>
        ) : (
          groups.map((g) => (
            <section key={g.label} className="mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2 px-1">{g.label}</h2>
              <div className="bg-surface dark:bg-[#121114] rounded-2xl border border-border divide-y divide-border overflow-hidden">
                {g.rows.map((txn: any) => {
                  const meta = txnMeta(txn.type);
                  const Icon = meta.icon;
                  const amount = Number(txn.amount);
                  return (
                    <div key={txn.id} className="flex items-center gap-3 px-4 py-3.5">
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${meta.tint}`}>
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink truncate">{meta.label}</p>
                        <p className="text-xs text-ink-muted">{txnTime(txn.created_at)}</p>
                      </div>
                      <p className={`text-sm font-medium tabular-nums flex-shrink-0 ${amount >= 0 ? "text-accent" : "text-ink"}`}>
                        {amount >= 0 ? "+" : "-"}
                        {formatUsd(Math.abs(amount))}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
