// src/pages/admin/AdminGiveBack.tsx
// ============================================================
// Admin — Give Back settlement visibility.
//
// See AKO_GIVE_BACK_DISTRIBUTION_SYSTEM.md. This page is
// deliberately read-only about the mechanic: it never shows a
// participant's points, or who earned what, or the per-user
// breakdown — the spec is explicit that Give Back should not be a
// visible score to anyone, including here. What it does show is
// the money: how big each promotion's pool is, whether it's been
// settled, how much actually got distributed, and to how many
// people — the same level of detail an admin would want for any
// other ledger-affecting process.
//
// Settlement itself runs automatically: a cron job
// (give-back-daily-settlement) calls run_due_give_back_settlements()
// every 15 minutes and picks up anything that just ended or was
// cancelled. The "Settle now" button here is a manual escape hatch
// so an admin doesn't have to wait on the cron to verify a payout,
// or to retry one that failed — it's a safe no-op on anything
// already settled.
// ============================================================
import { useSmartBack } from "../../hooks/useSmartBack";
import { ArrowLeft, HandCoins } from "lucide-react";
import { useGiveBackPromotions, useSettleGiveBack, type GiveBackPromotion } from "../../hooks/usePromotions";
import { formatUsd } from "../../lib/money";

function isSettleable(promo: GiveBackPromotion): boolean {
  if (promo.give_back_settled_at) return false;
  if (promo.status === "cancelled") return true;
  if ((promo.status === "approved" || promo.status === "completed") && promo.ends_at) {
    return new Date(promo.ends_at).getTime() <= Date.now();
  }
  return false;
}

function statusLabel(promo: GiveBackPromotion): { label: string; className: string } {
  const settlement = promo.give_back_settlements?.[0];

  if (settlement) {
    if (settlement.status === "completed") {
      return { label: "Settled", className: "bg-accent-soft text-accent" };
    }
    if (settlement.status === "zero_participants") {
      return { label: "Settled — no eligible participants", className: "bg-border text-ink-muted" };
    }
    return { label: "Settled — no pool", className: "bg-border text-ink-muted" };
  }
  if (promo.status === "cancelled") return { label: "Cancelled — awaiting settlement", className: "bg-danger/10 text-danger" };
  if (promo.status === "paused") return { label: "Paused — accruing frozen", className: "bg-pushback/10 text-pushback" };
  if (isSettleable(promo)) return { label: "Ended — awaiting settlement", className: "bg-pushback/10 text-pushback" };
  return { label: "Live", className: "bg-accent-soft text-accent" };
}

export function AdminGiveBack() {
  const smartBack = useSmartBack();
  const { data: promotions, isLoading } = useGiveBackPromotions();
  const settleGiveBack = useSettleGiveBack();

  return (
    <div className="min-h-screen bg-canvas px-4 pt-8 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted" aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-2xl text-ink flex items-center gap-2">
            <HandCoins size={22} className="text-accent" />
            Give Back
          </h1>
        </div>

        {isLoading && <p className="text-ink-muted text-sm">Loading…</p>}

        {!isLoading && (!promotions || promotions.length === 0) && (
          <p className="text-ink-muted text-sm">No promotions have had a Give Back pool yet.</p>
        )}

        <div className="space-y-3">
          {promotions?.map((promo) => {
            const settlement = promo.give_back_settlements?.[0];
            const { label, className } = statusLabel(promo);
            const settleable = isSettleable(promo);

            return (
              <div key={promo.id} className="bg-surface rounded-xl p-4 border border-border">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">
                      {promo.promoter?.display_name ?? promo.promoter?.username}
                    </p>
                    <p className="text-xs text-ink-muted truncate">
                      {promo.post?.heading || promo.post?.content?.slice(0, 60) || "Untitled post"}
                    </p>
                  </div>
                  <span className={`text-xs font-medium rounded-full px-2 py-1 whitespace-nowrap ${className}`}>
                    {label}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm text-ink mt-3">
                  <span className="text-ink-muted">Pool</span>
                  <span className="font-medium">{formatUsd(promo.give_back_usd ?? 0)}</span>
                </div>

                {settlement?.status === "completed" && (
                  <>
                    <div className="flex items-center justify-between text-sm text-ink mt-1">
                      <span className="text-ink-muted">Distributed</span>
                      <span className="font-medium">{formatUsd(settlement.distributed_usd)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-ink mt-1">
                      <span className="text-ink-muted">Participants</span>
                      <span className="font-medium">{settlement.participant_count}</span>
                    </div>
                  </>
                )}

                {settleable && (
                  <button
                    onClick={() => settleGiveBack.mutate(promo.id)}
                    disabled={settleGiveBack.isPending}
                    className="w-full mt-3 bg-accent text-canvas text-sm font-medium rounded-lg py-2 disabled:opacity-50"
                  >
                    {settleGiveBack.isPending ? "Settling…" : "Settle now"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
