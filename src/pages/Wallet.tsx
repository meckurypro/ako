import { Link } from "react-router-dom";
import { ArrowDownCircle, ArrowUpCircle, TrendingUp } from "lucide-react";
import { useWallet, useWalletTransactions } from "../hooks/useWallet";
import { BottomNav } from "../components/BottomNav";
import { Wordmark } from "../components/Wordmark";
import { useFeatureFlag } from "../hooks/useFeatureFlags";

const TXN_LABELS: Record<string, string> = {
  fund: "Funding",
  gift_sent: "Gift sent",
  gift_received: "Gift received",
  platform_fee: "Platform fee",
  withdrawal: "Withdrawal",
  reversal: "Reversal",
  dev_credit: "Dev credit",
  affiliate_commission: "Affiliate commission",
  affiliate_commission_reversal: "Affiliate commission reversed",
  promotion_charge: "Promotion charge",
  promotion_refund: "Promotion refund",
  give_back: "Give Back reward",
  give_back_reversal: "Give Back reward reversed",
};

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
        <div className="bg-surface rounded-2xl p-6 text-center">
          <p className="text-sm text-ink-muted mb-1">Balance</p>
          <p className="font-display text-4xl text-ink">
            {isLoading ? "…" : `$${Number(wallet?.balance ?? 0).toFixed(2)}`}
          </p>

          <div className="flex gap-3 mt-6">
            {depositsEnabled && (
              <Link
                to="/wallet/fund"
                className="flex-1 flex items-center justify-center gap-2 bg-accent text-canvas py-3 rounded-xl font-medium text-sm"
              >
                <ArrowDownCircle size={18} />
                Fund
              </Link>
            )}
            {withdrawalsEnabled && (
              <Link
                to="/wallet/withdraw"
                className="flex-1 flex items-center justify-center gap-2 bg-accent-soft text-accent py-3 rounded-xl font-medium text-sm"
              >
                <ArrowUpCircle size={18} />
                Withdraw
              </Link>
            )}
          </div>
          {!depositsEnabled && !withdrawalsEnabled && (
            <p className="text-xs text-ink-muted mt-4">Funding and withdrawals are temporarily unavailable.</p>
          )}
        </div>

        {affiliateEnabled && (
          <Link
            to="/wallet/affiliate-links"
            className="flex items-center justify-center gap-2 text-accent text-sm font-medium mt-4"
          >
            <TrendingUp size={15} />
            My affiliate links
          </Link>
        )}

        <h3 className="font-display text-lg text-ink mt-8 mb-3">Recent activity</h3>

        {!transactions || transactions.length === 0 ? (
          <p className="text-ink-muted text-sm text-center py-8">No transactions yet.</p>
        ) : (
          <div className="space-y-1">
            {transactions.map((txn: any) => (
              <div
                key={txn.id}
                className="flex items-center justify-between py-3 border-b border-border"
              >
                <div>
                  <p className="text-sm text-ink">{TXN_LABELS[txn.type] ?? txn.type}</p>
                  <p className="text-xs text-ink-muted">
                    {new Date(txn.created_at).toLocaleDateString()}
                  </p>
                </div>
                <p
                  className={`text-sm font-medium ${
                    Number(txn.amount) >= 0 ? "text-accent" : "text-ink-muted"
                  }`}
                >
                  {Number(txn.amount) >= 0 ? "+" : ""}
                  {Number(txn.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
