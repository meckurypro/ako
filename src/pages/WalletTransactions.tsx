// src/pages/WalletTransactions.tsx
//
// The full transaction history, one tap from the Wallet.
//   • Category and status dropdowns (chips) narrow the list.
//   • The period header ("Oct 2026 ▾") opens a Month / Time Frame picker; it shows what came In and went Out in the
//     period, and tapping In or Out filters the list to that direction.
//   • Analysis breaks the period down by category; Download exports exactly what is on screen as a CSV.
// Totals and the analysis count successful (completed) transactions only.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, Download } from "lucide-react";
import { useWalletTransactionsInRange } from "../hooks/useWallet";
import { BottomNav } from "../components/BottomNav";
import { useToast } from "../components/Toast";
import { TxnPeriodSheet } from "../components/wallet/TxnPeriodSheet";
import { TxnAnalysisSheet } from "../components/wallet/TxnAnalysisSheet";
import { formatUsd } from "../lib/money";
import { txnMeta, statusMeta, TXN_STATUS_ORDER } from "../lib/walletTxn";
import { buildTransactionsCsv, downloadTextFile } from "../lib/walletCsv";
import { periodBounds, periodFileSlug, periodLabel, ymOf, type TxnPeriod } from "../lib/walletRange";

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
type Panel = "category" | "status" | null;

function FilterTrigger({
  label,
  open,
  active,
  onClick,
}: {
  label: string;
  open: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-haspopup="listbox"
      className={`relative z-20 flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
        open || active ? "border-accent/40 bg-accent-soft text-accent" : "border-border bg-surface text-ink"
      }`}
    >
      <span className="min-w-0 flex-1 truncate text-center">{label}</span>
      <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm transition-colors ${
        selected ? "bg-accent-soft font-medium text-accent ring-1 ring-inset ring-accent/40" : "bg-canvas text-ink hover:bg-ink/5"
      }`}
    >
      {children}
    </button>
  );
}

export function WalletTransactionsPage() {
  const toast = useToast();
  const [period, setPeriod] = useState<TxnPeriod>(() => ({ kind: "month", at: ymOf() }));
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [direction, setDirection] = useState<Direction>("all");
  const [panel, setPanel] = useState<Panel>(null);
  const [showPeriod, setShowPeriod] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const bounds = useMemo(() => periodBounds(period), [period]);
  const { data, isLoading, isError, isPlaceholderData } = useWalletTransactionsInRange(bounds.from, bounds.to);
  const periodRows = useMemo(() => (data as any[] | undefined) ?? [], [data]);
  const label = periodLabel(period);

  // Categories that actually occur in this period (a chip with nothing behind it is just noise).
  const categories = useMemo(() => {
    const types = [...new Set(periodRows.map((t) => t.type as string))];
    return types.sort((a, b) => txnMeta(a).label.localeCompare(txnMeta(b).label));
  }, [periodRows]);

  // A category picked in one month may not exist in the next — fall back to "all" rather than show an empty list.
  const activeCategory = !isPlaceholderData && category !== "all" && !categories.includes(category) ? "all" : category;
  const activeStatus = status;

  // Esc closes an open dropdown.
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  // Category + status narrow everything; direction only narrows the list (the In/Out totals stay put so they can
  // double as the direction toggle).
  const scoped = useMemo(
    () =>
      periodRows.filter(
        (t) => (activeCategory === "all" || t.type === activeCategory) && (activeStatus === "all" || t.status === activeStatus),
      ),
    [periodRows, activeCategory, activeStatus],
  );

  const summary = useMemo(() => {
    let moneyIn = 0;
    let moneyOut = 0;
    for (const t of scoped) {
      if (t.status !== "completed") continue;
      const amt = Number(t.amount);
      if (amt > 0) moneyIn += amt;
      else if (amt < 0) moneyOut += -amt;
    }
    return { moneyIn, moneyOut };
  }, [scoped]);

  const visible = useMemo(
    () =>
      scoped.filter((t) => {
        const amt = Number(t.amount);
        return direction === "all" ? true : direction === "in" ? amt > 0 : amt < 0;
      }),
    [scoped, direction],
  );

  const groups = useMemo(() => {
    const out: { label: string; rows: any[] }[] = [];
    for (const t of visible) {
      const dl = dayLabel(t.created_at);
      const last = out[out.length - 1];
      if (last && last.label === dl) last.rows.push(t);
      else out.push({ label: dl, rows: [t] });
    }
    return out;
  }, [visible]);

  function handleDownload() {
    if (visible.length === 0) return;
    downloadTextFile(`ako-transactions-${periodFileSlug(period)}.csv`, buildTransactionsCsv(visible));
    toast(`Downloaded ${visible.length} transaction${visible.length === 1 ? "" : "s"}`, { variant: "success" });
  }

  const categoryLabel = activeCategory === "all" ? "All Categories" : txnMeta(activeCategory).label;
  const statusLabel = activeStatus === "all" ? "All Status" : statusMeta(activeStatus).label;
  const filtersActive = activeCategory !== "all" || activeStatus !== "all" || direction !== "all";

  return (
    <div className="min-h-screen bg-canvas pb-28">
      <div className="mx-auto max-w-xl px-4 pt-5 md:max-w-3xl md:px-8 md:pt-10">
        <div className="mb-4 flex items-center gap-3">
          <Link to="/wallet" className="inline-flex text-ink-muted" aria-label="Back to wallet">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="flex-1 font-display text-xl text-ink">Transactions</h1>
          <button
            type="button"
            onClick={handleDownload}
            disabled={visible.length === 0}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent disabled:opacity-40"
          >
            <Download size={16} />
            Download
          </button>
        </div>

        {/* Category / status dropdowns */}
        <div className="relative mb-3">
          <div className="grid grid-cols-2 gap-3">
            <FilterTrigger
              label={categoryLabel}
              open={panel === "category"}
              active={activeCategory !== "all"}
              onClick={() => setPanel(panel === "category" ? null : "category")}
            />
            <FilterTrigger
              label={statusLabel}
              open={panel === "status"}
              active={activeStatus !== "all"}
              onClick={() => setPanel(panel === "status" ? null : "status")}
            />
          </div>

          {panel && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPanel(null)} aria-hidden="true" />
              <div
                role="listbox"
                aria-label={panel === "category" ? "Category" : "Status"}
                className="animate-ako-fade-up absolute inset-x-0 top-full z-20 mt-2 flex flex-wrap gap-2 rounded-2xl border border-border bg-surface p-3 shadow-xl"
              >
                {panel === "category" ? (
                  <>
                    <Chip
                      selected={activeCategory === "all"}
                      onClick={() => {
                        setCategory("all");
                        setPanel(null);
                      }}
                    >
                      All Categories
                    </Chip>
                    {categories.map((type) => (
                      <Chip
                        key={type}
                        selected={activeCategory === type}
                        onClick={() => {
                          setCategory(type);
                          setPanel(null);
                        }}
                      >
                        {txnMeta(type).label}
                      </Chip>
                    ))}
                  </>
                ) : (
                  <>
                    <Chip
                      selected={activeStatus === "all"}
                      onClick={() => {
                        setStatus("all");
                        setPanel(null);
                      }}
                    >
                      All Status
                    </Chip>
                    {TXN_STATUS_ORDER.map((s) => (
                      <Chip
                        key={s}
                        selected={activeStatus === s}
                        onClick={() => {
                          setStatus(s);
                          setPanel(null);
                        }}
                      >
                        {statusMeta(s).label}
                      </Chip>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Period + totals */}
        <div className="mb-5 rounded-2xl border border-border bg-surface px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowPeriod(true)}
              className="inline-flex min-w-0 items-center gap-1.5 font-display text-xl text-ink"
              aria-label={`Period: ${label}. Change period`}
            >
              <span className="truncate">{label}</span>
              <ChevronDown size={18} className="shrink-0 text-ink-muted" />
            </button>
            <button
              type="button"
              onClick={() => setShowAnalysis(true)}
              className="shrink-0 rounded-full bg-accent-soft px-4 py-1.5 text-sm font-medium text-accent hover:bg-accent-soft/70"
            >
              Analysis
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm tabular-nums">
            <button
              type="button"
              aria-pressed={direction === "in"}
              onClick={() => setDirection(direction === "in" ? "all" : "in")}
              className={`rounded-md py-0.5 ${direction === "in" ? "bg-accent-soft px-1.5 text-accent" : "text-ink-muted"}`}
            >
              In: <span className="font-medium text-accent">+{formatUsd(summary.moneyIn)}</span>
            </button>
            <button
              type="button"
              aria-pressed={direction === "out"}
              onClick={() => setDirection(direction === "out" ? "all" : "out")}
              className={`rounded-md py-0.5 ${direction === "out" ? "bg-ink/5 px-1.5 text-ink" : "text-ink-muted"}`}
            >
              Out: <span className="font-medium text-ink">-{formatUsd(summary.moneyOut)}</span>
            </button>
            {filtersActive && (
              <button
                type="button"
                onClick={() => {
                  setCategory("all");
                  setStatus("all");
                  setDirection("all");
                }}
                className="text-xs text-ink-muted underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="py-12 text-center text-sm text-ink-muted">Loading…</p>
        ) : isError ? (
          <p className="py-12 text-center text-sm text-danger">Couldn't load your transactions. Try again in a moment.</p>
        ) : groups.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-muted">
            {periodRows.length > 0 ? "Nothing matches these filters." : `No transactions in ${label}.`}
          </p>
        ) : (
          <div className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
            {groups.map((g) => (
              <section key={g.label} className="mb-5">
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">{g.label}</h2>
                <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface dark:bg-[#121114]">
                  {g.rows.map((txn: any) => {
                    const meta = txnMeta(txn.type);
                    const st = statusMeta(txn.status);
                    const Icon = meta.icon;
                    const amount = Number(txn.amount);
                    return (
                      <div key={txn.id} className="flex items-center gap-3 px-4 py-3.5">
                        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${meta.tint}`}>
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-ink">{meta.label}</p>
                          <p className="text-xs text-ink-muted">{txnTime(txn.created_at)}</p>
                        </div>
                        <div className="flex flex-shrink-0 flex-col items-end gap-1">
                          <p className={`text-sm font-medium tabular-nums ${amount > 0 ? "text-accent" : "text-ink"}`}>
                            {amount > 0 ? "+" : amount < 0 ? "-" : ""}
                            {formatUsd(Math.abs(amount))}
                          </p>
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none ${st.tone}`}>{st.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {showPeriod && <TxnPeriodSheet period={period} onApply={setPeriod} onClose={() => setShowPeriod(false)} />}
      {showAnalysis && <TxnAnalysisSheet rows={periodRows} periodLabel={label} onClose={() => setShowAnalysis(false)} />}

      <BottomNav />
    </div>
  );
}
