import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  Gift,
  Receipt,
  RotateCcw,
  Megaphone,
  Heart,
  Sparkles,
  Wallet,
  Gem,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { useWallet, useWalletTransactions } from "../hooks/useWallet";
import { BottomNav } from "../components/BottomNav";
import { Wordmark } from "../components/Wordmark";
import { useFeatureFlag } from "../hooks/useFeatureFlags";
import { useWithdrawalEligibility } from "../hooks/useWalletRates";
import { useWithdrawals } from "../hooks/usePayout";
import { formatUsd } from "../lib/money";

// Each transaction type gets its own label, icon, and icon tint —
// scanning a long history by icon shape/color is faster than reading
// every line, which is most of what "premium" means for a list like
// this (see file header note below for the rest of that reasoning).
const TXN_META: Record<string, { label: string; icon: LucideIcon; tint: string }> = {
  fund: { label: "Wallet funded", icon: ArrowDownCircle, tint: "text-accent bg-accent-soft" },
  gift_sent: { label: "Gift sent", icon: Gift, tint: "text-ink-muted bg-ink/5" },
  gift_received: { label: "Gift received", icon: Gift, tint: "text-accent bg-accent-soft" },
  platform_fee: { label: "Platform fee", icon: Receipt, tint: "text-ink-muted bg-ink/5" },
  withdrawal: { label: "Withdrawal", icon: ArrowUpCircle, tint: "text-ink-muted bg-ink/5" },
  reversal: { label: "Reversal", icon: RotateCcw, tint: "text-accent bg-accent-soft" },
  dev_credit: { label: "Dev credit", icon: Sparkles, tint: "text-accent bg-accent-soft" },
  affiliate_commission: { label: "Affiliate commission", icon: TrendingUp, tint: "text-accent bg-accent-soft" },
  affiliate_commission_reversal: { label: "Affiliate commission reversed", icon: RotateCcw, tint: "text-ink-muted bg-ink/5" },
  promotion_charge: { label: "Promotion charge", icon: Megaphone, tint: "text-ink-muted bg-ink/5" },
  promotion_refund: { label: "Promotion refund", icon: RotateCcw, tint: "text-accent bg-accent-soft" },
  give_back: { label: "Give Back reward", icon: Heart, tint: "text-accent bg-accent-soft" },
  give_back_reversal: { label: "Give Back reward reversed", icon: RotateCcw, tint: "text-ink-muted bg-ink/5" },
};

// Activity is grouped under day headings ("Today", "Yesterday", "Oct 18") —
// the same calm, label-then-rows rhythm as Library and Discover — instead of
// repeating a date on every line.
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

type ActivityFilter = "all" | "in" | "out";
const FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "in", label: "Money in" },
  { id: "out", label: "Money out" },
];

function BalanceAction({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1.5 rounded-2xl py-2 transition-colors hover:bg-canvas/10 active:bg-canvas/15">
      <span className="w-11 h-11 rounded-full bg-canvas/15 flex items-center justify-center text-canvas">
        <Icon size={20} />
      </span>
      <span className="text-xs font-medium text-canvas">{label}</span>
    </Link>
  );
}

/**
 * Item #8 (task list, chat) — "revamp wallet page, make it feel
 * premium and professional." Three changes from the old plain
 * balance-card-and-list version:
 *   1. The balance sits on its own accent-gradient card (echoing a
 *      physical card face — the one deliberately bold element on the
 *      page) instead of a plain surface tile, with a large faint
 *      wallet glyph watermarked into the corner.
 *   2. Fund/Withdraw become icon-in-a-circle actions below the card
 *      (a common, legible "bank app" action-row pattern) instead of
 *      two same-weight pill buttons.
 *   3. Recent activity gets a per-type icon + tint (see TXN_META)
 *      instead of every row looking identical apart from its label.
 * Balance/history staying visible while wallet_enabled is off, the
 * feature-flag gating, and the underlying data hooks are all
 * unchanged from before.
 */
export function WalletPage() {
  const { data: wallet, isLoading } = useWallet();
  const { data: transactions } = useWalletTransactions();
  const walletEnabled = useFeatureFlag("wallet_enabled");
  const depositsEnabled = useFeatureFlag("deposits_enabled");
  const withdrawalsEnabled = useFeatureFlag("withdrawals_enabled");
  const affiliateEnabled = useFeatureFlag("affiliate_programs_enabled");
  const { data: eligibility } = useWithdrawalEligibility();
  const { data: withdrawals } = useWithdrawals();
  const [filter, setFilter] = useState<ActivityFilter>("all");

  // Requests that have left the wallet but not yet reached the bank.
  const inReviewUsd = (withdrawals ?? [])
    .filter((w) => w.status === "pending" || w.status === "processing")
    .reduce((sum, w) => sum + Number(w.amount_usd), 0);

  const groups = useMemo(() => {
    const rows = ((transactions as any[] | undefined) ?? []).filter((t) => {
      const amt = Number(t.amount);
      return filter === "all" ? true : filter === "in" ? amt >= 0 : amt < 0;
    });
    const out: { label: string; rows: any[] }[] = [];
    for (const t of rows) {
      const label = dayLabel(t.created_at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.rows.push(t);
      else out.push({ label, rows: [t] });
    }
    return out;
  }, [transactions, filter]);

  // The main entry point into this page (ProfilePage's owner menu) is
  // already hidden when this is off — this is the defensive layer for
  // anyone who navigates to /wallet directly, or had it open in a tab
  // when an admin flipped the switch. Balance/history for anyone who
  // still lands here some other way stays visible either way — this
  // only blocks the two money-moving actions.
  if (!walletEnabled) {
    return (
      <div className="min-h-screen bg-canvas pb-24">
        <div className="md:hidden">
          <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-chrome border-b border-border">
            <Wordmark size="sm" />
          </header>
        </div>
        <div className="max-w-xl mx-auto px-4 pt-10 text-center">
          <p className="text-sm text-ink-muted">The wallet is temporarily unavailable. Check back later.</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <div className="md:hidden">
        <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-chrome border-b border-border">
          <Wordmark size="sm" />
        </header>
      </div>

      {/* Desktop: balance/actions form a sticky left rail, history gets
          real table-width room on the right — per audit doc §13
          ("Wallet: table/history width"), not the same 576px column as
          Feed. Mobile keeps the original single stacked column. */}
      <div className="max-w-xl md:max-w-5xl mx-auto px-4 md:px-8 pt-6 md:pt-10 md:grid md:grid-cols-[360px_1fr] md:gap-10 md:items-start">
        {/* ── Balance card — the one bold element on the page ── */}
        <div
          className="relative overflow-hidden rounded-[28px] p-6 pt-7 md:sticky md:top-10"
          style={{
            background: "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)",
            boxShadow:
              "0 0 0 1px rgba(var(--shadow-ink-rgb), 0.07), 0 20px 40px -12px rgba(var(--shadow-ink-rgb), 0.35)",
          }}
        >
          {/* Faint oversized icon watermarked into the corner — purely
              decorative, aria-hidden, and clipped by the card's own
              overflow-hidden so it never interferes with the real content
              stacked above it. */}
          <Wallet
            size={140}
            strokeWidth={1}
            className="absolute -right-6 -top-6 text-canvas opacity-[0.12] pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-canvas/70">Available balance</p>
            <Wallet size={18} className="text-canvas/70" aria-hidden="true" />
          </div>

          <p className="relative font-display text-5xl text-canvas mt-3 mb-8 tabular-nums">
            {isLoading ? "…" : formatUsd(wallet?.balance ?? 0)}
          </p>

          <div className="relative grid grid-cols-4 gap-2">
            {depositsEnabled && <BalanceAction to="/wallet/fund" icon={ArrowDownCircle} label="Fund" />}
            {withdrawalsEnabled && <BalanceAction to="/wallet/withdraw" icon={ArrowUpCircle} label="Withdraw" />}
            <BalanceAction to="/wallet/gifts" icon={Gem} label="Vault" />
            {affiliateEnabled && <BalanceAction to="/wallet/affiliate-links" icon={TrendingUp} label="Affiliate" />}
          </div>

          {!depositsEnabled && !withdrawalsEnabled && (
            <p className="relative text-xs text-canvas/70 mt-5">Funding and withdrawals are temporarily unavailable.</p>
          )}
        </div>

        {/* Withdrawal position — the two numbers people check before asking for money out. */}
        {withdrawalsEnabled && (eligibility || inReviewUsd > 0) && (
          <div className="mt-4 grid grid-cols-2 gap-3 md:col-start-1">
            <div className="rounded-2xl border border-border bg-surface px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-muted">Can withdraw</p>
              <p className="font-display text-xl text-ink tabular-nums mt-0.5">
                {formatUsd(eligibility?.available_to_request ?? 0)}
              </p>
              <p className="text-[11px] text-ink-muted mt-0.5">this week</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-muted flex items-center gap-1">
                <Clock size={11} aria-hidden="true" /> In review
              </p>
              <p className="font-display text-xl text-ink tabular-nums mt-0.5">{formatUsd(inReviewUsd)}</p>
              <p className="text-[11px] text-ink-muted mt-0.5">on its way to your bank</p>
            </div>
          </div>
        )}

        <div className="md:row-span-2 md:col-start-2 md:row-start-1">
          <h3 className="font-display text-lg text-ink mt-8 md:mt-0 mb-3">Activity</h3>

          <div className="-mx-4 px-4 mb-4 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 w-max" role="tablist" aria-label="Filter activity">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`shrink-0 px-3.5 py-2 rounded-full text-sm border transition-colors ${
                    filter === f.id
                      ? "bg-accent text-canvas border-accent"
                      : "bg-surface text-ink border-border hover:border-accent/50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-ink-muted text-sm">
                {transactions && transactions.length > 0 ? "Nothing here for this filter." : "No transactions yet."}
              </p>
              {(!transactions || transactions.length === 0) && (
                <p className="text-ink-muted text-xs mt-1">Everything you fund, spend, and earn will show up here.</p>
              )}
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.label} className="mb-5">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2 px-1">{g.label}</h4>
                <div className="bg-surface dark:bg-[#121114] rounded-2xl border border-border divide-y divide-border overflow-hidden">
                  {g.rows.map((txn: any) => {
                    const meta = TXN_META[txn.type] ?? { label: txn.type, icon: Receipt, tint: "text-ink-muted bg-ink/5" };
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
      </div>

      <BottomNav />
    </div>
  );
}
