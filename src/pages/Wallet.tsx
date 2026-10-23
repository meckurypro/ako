import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  Gift,
  Receipt,
  Clock,
  RotateCcw,
  Megaphone,
  Heart,
  Sparkles,
  Gem,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { useWallet, useWalletTransactions } from "../hooks/useWallet";
import { BottomNav } from "../components/BottomNav";
import { BrandCard } from "../components/BrandCard";
import { OptionsModal, type OptionItem } from "../components/OptionsModal";
import { Wordmark } from "../components/Wordmark";
import { useFeatureFlag } from "../hooks/useFeatureFlags";
import { useWithdrawalEligibility } from "../hooks/useWalletRates";
import { useWithdrawals } from "../hooks/usePayout";
import { formatUsd } from "../lib/money";
import { WALLET_PERIODS, inPeriod, type WalletPeriod } from "../lib/walletPeriod";

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
  const [period, setPeriod] = useState<WalletPeriod>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Requests that have left the wallet but not yet reached the bank.
  const inReviewUsd = (withdrawals ?? [])
    .filter((w) => w.status === "pending" || w.status === "processing")
    .reduce((sum, w) => sum + Number(w.amount_usd), 0);

  // Period first, so the in/out summary reflects the chosen range regardless of the In/Out filter.
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
  }, [periodRows, filter]);

  // The hamburger: everything that used to sit around the balance card, grouped by what it's for. First the two
  // numbers people check before asking for money out (both lead to Withdraw, which also lists past requests), then
  // the other ways money reaches the wallet.
  const menuItems: (OptionItem | "divider")[] = [
    ...(withdrawalsEnabled
      ? ([
          {
            key: "can-withdraw",
            label: "Can withdraw",
            description: "this week",
            icon: <ArrowUpCircle />,
            badge: <span className="text-sm font-semibold tabular-nums text-overlay-ink">{formatUsd(eligibility?.available_to_request ?? 0)}</span>,
            onSelect: () => navigate("/wallet/withdraw"),
          },
          {
            key: "in-review",
            label: "In review",
            description: "on its way to your bank",
            icon: <Clock />,
            badge: <span className="text-sm font-semibold tabular-nums text-overlay-ink">{formatUsd(inReviewUsd)}</span>,
            onSelect: () => navigate("/wallet/withdraw"),
          },
          "divider",
        ] satisfies (OptionItem | "divider")[])
      : []),
    { key: "gifts", label: "Gift Vault", description: "Gifts you've been given", icon: <Gem />, onSelect: () => navigate("/wallet/gifts") },
    ...(affiliateEnabled
      ? ([
          { key: "affiliate", label: "Affiliate", description: "Forked projects & commissions", icon: <TrendingUp />, onSelect: () => navigate("/wallet/affiliate-links") },
        ] satisfies OptionItem[])
      : []),
  ];

  const menuButton = (
    <button
      type="button"
      onClick={() => setMenuOpen(true)}
      aria-label="Wallet menu"
      title="Menu"
      className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-ink-muted active:bg-surface"
    >
      <Menu size={24} />
    </button>
  );

  // The main entry point into this page (ProfilePage's owner menu) is
  // already hidden when this is off — this is the defensive layer for
  // anyone who navigates to /wallet directly, or had it open in a tab
  // when an admin flipped the switch. Balance/history for anyone who
  // still lands here some other way stays visible either way — this
  // only blocks the two money-moving actions.
  if (!walletEnabled) {
    return (
      <div className="min-h-screen bg-canvas pb-24">
        <header className="md:hidden px-4 pt-6 pb-3 border-b border-border">
          <Wordmark size="sm" />
        </header>
        <div className="max-w-xl mx-auto px-4 pt-10 text-center">
          <p className="text-sm text-ink-muted">The wallet is temporarily unavailable. Check back later.</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Nothing on this page is pinned: header, card and activity all scroll together. */}
      <header className="md:hidden relative px-4 pt-6 pb-3 border-b border-border h-[73px] box-border flex items-end justify-center">
        <Wordmark size="sm" />
        <div className="absolute right-4 bottom-1.5">{menuButton}</div>
      </header>

      {/* Desktop: balance on the left, history gets real table-width room on the right — per audit doc §13
          ("Wallet: table/history width"), not the same 576px column as Feed. Mobile is a single stacked column. */}
      <div className="max-w-xl md:max-w-5xl mx-auto px-4 md:px-8 pt-6 md:pt-6 md:grid md:grid-cols-[360px_1fr] md:gap-10 md:items-start">
        <div className="hidden md:flex md:col-span-2 items-center justify-between -mb-4">
          <h2 className="font-bold text-[1.75rem] leading-tight tracking-tight text-ink">Wallet</h2>
          {menuButton}
        </div>

        {/* ── Balance card — the one bold element on the page ── */}
        <div className="md:col-start-1 md:row-start-2">
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
          </BrandCard>
        </div>

        <div className="md:col-start-2 md:row-start-2">
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

          <div className="-mx-4 px-4 mb-3 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 w-max" role="tablist" aria-label="Filter by time">
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
          </div>

          {periodRows.length > 0 && (
            <p className="text-xs text-ink-muted mb-4 px-1 tabular-nums">
              In <span className="text-accent font-medium">+{formatUsd(summary.moneyIn)}</span> · Out{" "}
              <span className="text-ink font-medium">-{formatUsd(summary.moneyOut)}</span>
              {period !== "all" && <> · {WALLET_PERIODS.find((p) => p.id === period)!.label.toLowerCase()}</>}
            </p>
          )}

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

      {menuOpen && <OptionsModal title="Wallet" items={menuItems} onClose={() => setMenuOpen(false)} />}

      <BottomNav />
    </div>
  );
}
