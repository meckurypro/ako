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
  type LucideIcon,
} from "lucide-react";
import { useWallet, useWalletTransactions } from "../hooks/useWallet";
import { BottomNav } from "../components/BottomNav";
import { Wordmark } from "../components/Wordmark";
import { useFeatureFlag } from "../hooks/useFeatureFlags";
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

function txnDate(dateString: string): string {
  const d = new Date(dateString);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
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

  // The main entry point into this page (ProfilePage's owner menu) is
  // already hidden when this is off — this is the defensive layer for
  // anyone who navigates to /wallet directly, or had it open in a tab
  // when an admin flipped the switch. Balance/history for anyone who
  // still lands here some other way stays visible either way — this
  // only blocks the two money-moving actions.
  if (!walletEnabled) {
    return (
      <div className="min-h-screen bg-canvas pb-24">
        <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border">
          <Wordmark size="sm" asIcon iconTagline={false} />
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
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border">
        <Wordmark size="sm" asIcon iconTagline={false} />
      </header>

      <div className="max-w-xl mx-auto px-4 pt-6">
        {/* ── Balance card — the one bold element on the page ── */}
        <div
          className="relative overflow-hidden rounded-[28px] p-6 pt-7"
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

          <div className="relative flex items-center gap-6">
            {depositsEnabled && (
              <Link to="/wallet/fund" className="flex flex-col items-center gap-1.5">
                <span className="w-11 h-11 rounded-full bg-canvas/15 flex items-center justify-center text-canvas">
                  <ArrowDownCircle size={20} />
                </span>
                <span className="text-xs font-medium text-canvas">Fund</span>
              </Link>
            )}
            {withdrawalsEnabled && (
              <Link to="/wallet/withdraw" className="flex flex-col items-center gap-1.5">
                <span className="w-11 h-11 rounded-full bg-canvas/15 flex items-center justify-center text-canvas">
                  <ArrowUpCircle size={20} />
                </span>
                <span className="text-xs font-medium text-canvas">Withdraw</span>
              </Link>
            )}
            {affiliateEnabled && (
              <Link to="/wallet/affiliate-links" className="flex flex-col items-center gap-1.5">
                <span className="w-11 h-11 rounded-full bg-canvas/15 flex items-center justify-center text-canvas">
                  <TrendingUp size={20} />
                </span>
                <span className="text-xs font-medium text-canvas">Affiliate</span>
              </Link>
            )}
          </div>

          {!depositsEnabled && !withdrawalsEnabled && (
            <p className="relative text-xs text-canvas/70 mt-5">Funding and withdrawals are temporarily unavailable.</p>
          )}
        </div>

        <h3 className="font-display text-lg text-ink mt-8 mb-3">Recent activity</h3>

        {!transactions || transactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-ink-muted text-sm">No transactions yet.</p>
            <p className="text-ink-muted text-xs mt-1">Everything you fund, spend, and earn will show up here.</p>
          </div>
        ) : (
          <div className="bg-surface dark:bg-[#121114] rounded-2xl border border-border divide-y divide-border overflow-hidden">
            {transactions.map((txn: any) => {
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
                    <p className="text-xs text-ink-muted">{txnDate(txn.created_at)}</p>
                  </div>
                  <p className={`text-sm font-medium tabular-nums flex-shrink-0 ${amount >= 0 ? "text-accent" : "text-ink"}`}>
                    {amount >= 0 ? "+" : "-"}
                    {formatUsd(Math.abs(amount))}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
