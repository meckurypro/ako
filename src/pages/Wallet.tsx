import { Link } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronRight,
  Gem,
  ReceiptText,
  TrendingUp,
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
import { txnMeta } from "../lib/walletTxn";

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

// One tile in the links grid: icon in a soft circle, one-word label.
function Tile({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-2 py-1 active:opacity-70">
      <span className="w-12 h-12 rounded-full bg-accent-soft text-accent flex items-center justify-center">
        <Icon size={22} />
      </span>
      <span className="text-xs text-ink">{label}</span>
    </Link>
  );
}

/**
 * Wallet — compact, nothing hidden behind a menu:
 *   1. Balance card with Fund / Withdraw.
 *   2. Latest-transaction strip → full history lives on its own page (/wallet/transactions).
 *   3. Two numbers people check before cashing out: Can withdraw, In review.
 *   4. A short row of links: Transactions, Gift Vault, Affiliate.
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

  // Requests that have left the wallet but not yet reached the bank.
  const inReviewUsd = (withdrawals ?? [])
    .filter((w) => w.status === "pending" || w.status === "processing")
    .reduce((sum, w) => sum + Number(w.amount_usd), 0);

  const latest = (transactions as any[] | undefined)?.[0];
  const latestMeta = latest ? txnMeta(latest.type) : null;
  const latestAmount = latest ? Number(latest.amount) : 0;

  // The main entry point into this page (ProfilePage's owner menu) is already hidden when this is off — this is
  // the defensive layer for anyone who navigates to /wallet directly, or had it open when an admin flipped the switch.
  if (!walletEnabled) {
    return (
      <div className="min-h-screen bg-canvas pb-24">
        <header className="md:hidden px-4 pt-6 pb-3 border-b border-border">
          <Wordmark size="sm" />
        </header>
        <div className="max-w-xl mx-auto px-4 pt-10 text-center">
          <p className="text-sm text-ink-muted">Wallet unavailable. Check back soon.</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const tiles = [
    { key: "transactions", to: "/wallet/transactions", icon: ReceiptText, label: "Transactions" },
    { key: "gifts", to: "/wallet/gifts", icon: Gem, label: "Gift Vault" },
    ...(affiliateEnabled ? [{ key: "affiliate", to: "/wallet/affiliate-links", icon: TrendingUp, label: "Affiliate" }] : []),
  ];

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Nothing on this page is pinned: header and content scroll together. */}
      <header className="md:hidden px-4 pt-6 pb-3 border-b border-border h-[73px] box-border flex items-end justify-center">
        <Wordmark size="sm" />
      </header>

      <div className="max-w-xl mx-auto px-4 md:px-8 pt-6">
        <h2 className="hidden md:block font-bold text-[1.75rem] leading-tight tracking-tight text-ink mb-4">Wallet</h2>

        {/* ── Balance card — the one bold element on the page ── */}
        <BrandCard className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white">Balance</p>
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
          {!depositsEnabled && !withdrawalsEnabled && <p className="text-xs text-white/90">Funding and withdrawals are paused.</p>}
        </BrandCard>

        {/* ── Latest transaction → full history ── */}
        <Link
          to="/wallet/transactions"
          className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 active:opacity-70"
        >
          <p className="min-w-0 flex-1 truncate text-sm text-ink">
            {latest && latestMeta ? (
              <>
                {latestMeta.label}{" "}
                <span className={`font-medium tabular-nums ${latestAmount >= 0 ? "text-accent" : "text-ink"}`}>
                  {latestAmount >= 0 ? "+" : "-"}
                  {formatUsd(Math.abs(latestAmount))}
                </span>
              </>
            ) : (
              <span className="text-ink-muted">No transactions yet</span>
            )}
          </p>
          <span className="shrink-0 inline-flex items-center gap-0.5 text-xs text-ink-muted">
            Transactions <ChevronRight size={16} />
          </span>
        </Link>

        {/* ── Can withdraw / In review ── */}
        {withdrawalsEnabled && (
          <Link
            to="/wallet/withdraw"
            className="mt-3 grid grid-cols-2 divide-x divide-border rounded-2xl border border-border bg-surface active:opacity-70"
          >
            <div className="px-4 py-3">
              <p className="text-xs text-ink-muted">Can withdraw</p>
              <p className="mt-0.5 text-base font-semibold text-ink tabular-nums">{formatUsd(eligibility?.available_to_request ?? 0)}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-ink-muted">In review</p>
              <p className="mt-0.5 text-base font-semibold text-ink tabular-nums">{formatUsd(inReviewUsd)}</p>
            </div>
          </Link>
        )}

        {/* ── Links ── */}
        <nav
          className="mt-3 grid rounded-2xl border border-border bg-surface px-2 py-3"
          style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}
          aria-label="Wallet links"
        >
          {tiles.map((t) => (
            <Tile key={t.key} to={t.to} icon={t.icon} label={t.label} />
          ))}
        </nav>
      </div>

      <BottomNav />
    </div>
  );
}
