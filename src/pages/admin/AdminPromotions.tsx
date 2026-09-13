// src/pages/admin/AdminPromotions.tsx
import { useState } from "react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { ArrowLeft } from "lucide-react";
import { usePendingPromotions, useReviewPromotion } from "../../hooks/usePromotions";
import { formatUsd } from "../../lib/money";

export function AdminPromotions() {
  const smartBack = useSmartBack();
  const { data: promotions, isLoading } = usePendingPromotions();
  const reviewPromotion = useReviewPromotion();

  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approve" | "decline">("approve");
  const [giveBack, setGiveBack] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);

  function startDeciding(id: string, initialDecision: "approve" | "decline") {
    setDecidingId(id);
    setDecision(initialDecision);
    setGiveBack("");
    setFeedback("");
    setError(null);
  }

  async function handleConfirm(promotionId: string, totalCharged: number) {
    setError(null);

    if (decision === "approve") {
      const amount = Number(giveBack);
      if (!Number.isFinite(amount) || amount < 0) {
        setError("Enter a valid Give Back amount.");
        return;
      }
      if (amount > totalCharged) {
        setError(`Give Back can't exceed the campaign budget (${formatUsd(totalCharged)}).`);
        return;
      }
    } else if (!feedback.trim()) {
      setError("A reason is required to decline.");
      return;
    }

    try {
      await reviewPromotion.mutateAsync({
        promotion_id: promotionId,
        decision,
        give_back_usd: decision === "approve" ? Number(giveBack) : undefined,
        admin_feedback: feedback.trim() || undefined,
      });
      setDecidingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit this review.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Promotion review</h2>
        </div>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !promotions || promotions.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">Nothing pending. Queue is clear.</p>
        ) : (
          <div className="space-y-3">
            {promotions.map((promo) => (
              <div key={promo.id} className="bg-surface rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-ink">{promo.promoter.display_name}</span>
                  <span className="text-xs text-ink-muted">@{promo.promoter.username}</span>
                </div>

                {promo.post.heading && (
                  <p className="text-sm font-medium text-ink mt-2">{promo.post.heading}</p>
                )}
                <p className="text-sm text-ink-muted mt-1 bg-canvas rounded-lg p-2 line-clamp-3">
                  {promo.post.content}
                </p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted mt-3">
                  <span>{formatUsd(promo.daily_budget_usd)}/day</span>
                  <span>
                    {promo.duration_days} day{promo.duration_days === 1 ? "" : "s"}
                  </span>
                  <span className="font-medium text-ink">{formatUsd(promo.total_charged_usd)} total</span>
                  <span>{promo.interest_ids.length > 0 ? `${promo.interest_ids.length} interests targeted` : "No targeting (everyone)"}</span>
                </div>

                {decidingId === promo.id ? (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setDecision("approve")}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                          decision === "approve"
                            ? "bg-accent text-canvas border-accent"
                            : "bg-canvas text-ink-muted border-border"
                        }`}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecision("decline")}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                          decision === "decline"
                            ? "bg-danger text-canvas border-danger"
                            : "bg-canvas text-ink-muted border-border"
                        }`}
                      >
                        Decline
                      </button>
                    </div>

                    {decision === "approve" ? (
                      <input
                        value={giveBack}
                        onChange={(e) => setGiveBack(e.target.value)}
                        type="number"
                        min={0}
                        max={promo.total_charged_usd}
                        step="0.01"
                        placeholder={`Give Back amount (up to ${formatUsd(promo.total_charged_usd)})`}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink mb-2"
                      />
                    ) : null}

                    <input
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder={decision === "decline" ? "Reason for declining (required)" : "Feedback to the creator (optional)"}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink mb-2"
                    />

                    {error && (
                      <p className="text-danger text-sm mb-2" role="alert">
                        {error}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirm(promo.id, promo.total_charged_usd)}
                        disabled={reviewPromotion.isPending}
                        className="flex-1 bg-accent text-canvas py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        Confirm {decision === "approve" ? "approval" : "decline"}
                      </button>
                      <button
                        onClick={() => setDecidingId(null)}
                        className="flex-1 bg-canvas text-ink-muted border border-border py-2 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => startDeciding(promo.id, "approve")}
                      className="flex-1 bg-accent text-canvas py-2 rounded-lg text-sm font-medium"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => startDeciding(promo.id, "decline")}
                      className="flex-1 bg-canvas text-ink-muted border border-border py-2 rounded-lg text-sm"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
