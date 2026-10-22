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
  Gem,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useWallet, useWalletTransactions } from "../hooks/useWallet";
import { BottomNav } from "../components/BottomNav";
import { BrandCard } from "../components/BrandCard";
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

// Fund is the primary action: a solid white pill with deep-green text (a light button on a dark brand
// surface, so contrast holds in light, dark and page themes). Withdraw is its quieter translucent twin.
function CardPill({ to, icon: Icon, label, primary }: { to: string; icon: LucideIcon; label: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={`flex-1 h-11 rounded-full inline-flex items-center justify-center gap-2 text-sm font-semibold transition-[transform,background-color] active:scale-[0.98] ${
        primary
          ? "bg-white text-cta shadow-[0_6px_16px_-8px_rgba(0,0,0,0.5)] hover:bg-white/95"
          : "bg-white/15 text-white ring-1 ring-inset ring-white/25 hover:bg-white/20"
      }`}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}

// Secondary destinations sit under the card as quiet surface tiles — same bordered, rounded-2xl,
// accent-soft icon-chip language as the Profile's rows.
function ShortcutTile({ to, icon: Icon, title, hint }: { to: string; icon: LucideIcon; title: string; hint: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 transition-colors hover:border-accent/40"
    >
      <span className="w-10 h-10 rounded-full bg-accent-soft text-accent flex items-center justify-center shrink-0">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block text-xs text-ink-muted truncate">{hint}</span>
      </span>
      <ChevronRight size={16} className="text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
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
        <div className="md:sticky md:top-10">
          <BrandCard className="p-6 pt-6">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white">Available balance</p>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-white ring-1 ring-inset ring-white/20">
                USD
              </span>
            </div>

            <p className="font-display text-5xl text-white mt-3 mb-6 tabular-nums">
              {isLoading ? "…" : formatUsd(wallet?.balance ?? 0)}
            </p>

            {(depositsEnabled || withdrawalsEnabled) && (
              <div className="flex gap-3">
                {depositsEnabled && <CardPill to="/wallet/fund" icon={ArrowDownCircle} label="Fund" primary />}
                {withdrawalsEnabled && <CardPill to="/wallet/withdraw" icon={ArrowUpCircle} label="Withdraw" primary={!depositsEnabled} />}
              </div>
            )}
            {!depositsEnabled && !withdrawalsEnabled && (
              <p className="text-xs text-white/90">Funding and withdrawals are temporarily unavailable.</p>
            )}

            {/* Withdrawal position — the two numbers people check before asking for money out. */}
            {withdrawalsEnabled && (eligibility || inReviewUsd > 0) && (
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/15 pt-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-white/90">Can withdraw</p>
                  <p className="font-display text-xl text-white tabular-nums mt-0.5">
                    {formatUsd(eligibility?.available_to_request ?? 0)}
                  </p>
                  <p className="text-[11px] text-white/90">this week</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-white/90">In review</p>
                  <p className="font-display text-xl text-white tabular-nums mt-0.5">{formatUsd(inReviewUsd)}</p>
                  <p className="text-[11px] text-white/90">on its way to your bank</p>
                </div>
              </div>
            )}
          </BrandCard>

          <div className={`mt-3 grid gap-3 ${affiliateEnabled ? "grid-cols-2 md:grid-cols-1" : "grid-cols-1"}`}>
            <ShortcutTile to="/wallet/gifts" icon={Gem} title="Gift Vault" hint="Gifts you've received" />
            {affiliateEnabled && (
              <ShortcutTile to="/wallet/affiliate-links" icon={TrendingUp} title="Affiliate" hint="Links & earnings" />
            )}
          </div>
        </div>

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
                      ? "bg-cta text-white border-cta"
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
