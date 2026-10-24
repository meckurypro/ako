// src/lib/walletTxn.ts
//
// How a wallet transaction reads: label, icon, tint. Shared by the Wallet page (latest-transaction strip) and the
// Transactions page (full history).
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
  type LucideIcon,
} from "lucide-react";

export const TXN_META: Record<string, { label: string; icon: LucideIcon; tint: string }> = {
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
  purchase_sent: { label: "Purchase", icon: Receipt, tint: "text-ink-muted bg-ink/5" },
  purchase_received: { label: "Sale", icon: Receipt, tint: "text-accent bg-accent-soft" },
};

export const FALLBACK_TXN_META = { label: "", icon: Receipt, tint: "text-ink-muted bg-ink/5" };

export function txnMeta(type: string) {
  return TXN_META[type] ?? { ...FALLBACK_TXN_META, label: type };
}

// Ledger row status (wallet_transactions.status: pending | completed | failed | reversed). "completed" reads as
// "Successful"; only completed rows count toward the In / Out totals and the analysis.
export const TXN_STATUS_META: Record<string, { label: string; tone: string }> = {
  completed: { label: "Successful", tone: "text-accent bg-accent-soft" },
  pending: { label: "Pending", tone: "text-ink-muted bg-ink/5" },
  failed: { label: "Failed", tone: "text-danger bg-danger/10" },
  reversed: { label: "Reversed", tone: "text-ink-muted bg-ink/5" },
};

export const TXN_STATUS_ORDER = ["completed", "pending", "failed", "reversed"] as const;

export function statusMeta(status: string) {
  return TXN_STATUS_META[status] ?? { label: status, tone: "text-ink-muted bg-ink/5" };
}
