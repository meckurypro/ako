// src/pages/PromoteComposer.tsx
import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Megaphone, Pause, Play, XCircle, TimerReset } from "lucide-react";
import { useSmartBack } from "../hooks/useSmartBack";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useWallet } from "../hooks/useWallet";
import { useCategories } from "../hooks/useCategories";
import {
  useSubmitPromotion,
  usePromotionForPost,
  usePausePromotion,
  useResumePromotion,
  useTerminatePromotion,
  useExtendPromotion,
  PROMOTION_DAILY_BUDGET_MIN_USD,
  PROMOTION_DAILY_BUDGET_MAX_USD,
  PROMOTION_DURATION_MIN_DAYS,
  PROMOTION_DURATION_MAX_DAYS,
  type PromotionStatus,
} from "../hooks/usePromotions";
import { Button } from "../components/Button";
import { FormField } from "../components/FormField";
import { useFeatureFlag } from "../hooks/useFeatureFlags";
import { formatUsd } from "../lib/money";

interface PromotablePost {
  id: string;
  author_id: string;
  content: string;
  heading: string | null;
  status: string;
  is_deleted: boolean;
}

function usePromotablePost(postId: string | undefined) {
  return useQuery({
    queryKey: ["promotable-post", postId],
    queryFn: async (): Promise<PromotablePost> => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, author_id, content, heading, status, is_deleted")
        .eq("id", postId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });
}

const STATUS_COPY: Record<PromotionStatus, { label: string; tone: string }> = {
  pending: { label: "Submitted — awaiting admin review", tone: "text-ink-muted" },
  approved: { label: "Approved — live now", tone: "text-accent" },
  paused: { label: "Paused — not currently serving", tone: "text-ink-muted" },
  declined: { label: "Declined — refunded to your wallet", tone: "text-danger" },
  completed: { label: "Completed", tone: "text-ink-muted" },
  cancelled: { label: "Terminated — refunded for remaining days", tone: "text-ink-muted" },
};

export function PromoteComposer() {
  const { postId } = useParams<{ postId: string }>();
  const smartBack = useSmartBack();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: post, isLoading: postLoading } = usePromotablePost(postId);
  const { data: wallet } = useWallet();
  const { data: categories } = useCategories();
  const { data: existingPromotion, isLoading: promotionLoading } = usePromotionForPost(postId);
  const submitPromotion = useSubmitPromotion();
  const pausePromotion = usePausePromotion();
  const resumePromotion = useResumePromotion();
  const terminatePromotion = useTerminatePromotion();
  const extendPromotion = useExtendPromotion();
  const promotionsEnabled = useFeatureFlag("promotions_enabled");

  const [dailyBudget, setDailyBudget] = useState(String(PROMOTION_DAILY_BUDGET_MIN_USD));
  const [durationDays, setDurationDays] = useState(String(PROMOTION_DURATION_MIN_DAYS));
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [showExtendForm, setShowExtendForm] = useState(false);
  const [extendDays, setExtendDays] = useState("1");

  const totalCost = useMemo(() => {
    const budget = Number(dailyBudget);
    const days = Number(durationDays);
    if (!Number.isFinite(budget) || !Number.isFinite(days)) return 0;
    return Math.round(budget * days * 100) / 100;
  }, [dailyBudget, durationDays]);

  const isOwner = !!user && !!post && post.author_id === user.id;
  // Pending, approved, or paused all count as "already has a campaign"
  // for this post — pending/declined/completed/cancelled aside, this
  // is what blocks a second overlapping submission (also enforced
  // server-side).
  const hasActiveCampaign =
    existingPromotion?.status === "pending" ||
    existingPromotion?.status === "approved" ||
    existingPromotion?.status === "paused";
  const canManage = existingPromotion?.status === "approved" || existingPromotion?.status === "paused";

  function toggleInterest(id: string) {
    setSelectedInterests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handlePauseToggle() {
    if (!existingPromotion) return;
    setLifecycleError(null);
    try {
      if (existingPromotion.status === "paused") {
        await resumePromotion.mutateAsync(existingPromotion.id);
      } else {
        await pausePromotion.mutateAsync(existingPromotion.id);
      }
    } catch (err) {
      setLifecycleError(err instanceof Error ? err.message : "Couldn't update this campaign.");
    }
  }

  async function handleTerminate() {
    if (!existingPromotion) return;
    if (!window.confirm("End this campaign now? You'll be refunded for any remaining undelivered days.")) return;
    setLifecycleError(null);
    try {
      await terminatePromotion.mutateAsync(existingPromotion.id);
    } catch (err) {
      setLifecycleError(err instanceof Error ? err.message : "Couldn't terminate this campaign.");
    }
  }

  async function handleExtend(e: FormEvent) {
    e.preventDefault();
    if (!existingPromotion) return;
    const days = Number(extendDays);
    if (!Number.isInteger(days) || days <= 0) {
      setLifecycleError("Enter a whole number of days to add.");
      return;
    }
    setLifecycleError(null);
    try {
      await extendPromotion.mutateAsync({ promotionId: existingPromotion.id, additionalDays: days });
      setShowExtendForm(false);
      setExtendDays("1");
    } catch (err) {
      setLifecycleError(err instanceof Error ? err.message : "Couldn't extend this campaign.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!promotionsEnabled) {
      setError("Post promotions are temporarily disabled.");
      return;
    }

    const budget = Number(dailyBudget);
    const days = Number(durationDays);

    if (!Number.isFinite(budget) || budget < PROMOTION_DAILY_BUDGET_MIN_USD || budget > PROMOTION_DAILY_BUDGET_MAX_USD) {
      setError(`Daily budget must be between ${formatUsd(PROMOTION_DAILY_BUDGET_MIN_USD)} and ${formatUsd(PROMOTION_DAILY_BUDGET_MAX_USD)}.`);
      return;
    }
    if (!Number.isInteger(days) || days < PROMOTION_DURATION_MIN_DAYS || days > PROMOTION_DURATION_MAX_DAYS) {
      setError(`Duration must be between ${PROMOTION_DURATION_MIN_DAYS} and ${PROMOTION_DURATION_MAX_DAYS} days.`);
      return;
    }
    if (wallet && totalCost > wallet.balance) {
      setError(`This campaign costs ${formatUsd(totalCost)}, but your wallet balance is ${formatUsd(wallet.balance)}.`);
      return;
    }

    try {
      await submitPromotion.mutateAsync({
        post_id: postId!,
        daily_budget_usd: budget,
        duration_days: days,
        interest_ids: Array.from(selectedInterests),
      });
      navigate(`/post/${postId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit this campaign.");
    }
  }

  if (postLoading || promotionLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!post || post.is_deleted) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
        <p className="text-ink-muted text-center">This post is no longer available.</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
        <p className="text-ink-muted text-center">You can only promote your own posts.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-16">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink flex items-center gap-2">
            <Megaphone size={20} className="text-accent" />
            Promote this post
          </h2>
        </div>

        <div className="bg-surface dark:bg-[#121114] rounded-xl border border-border p-4 mb-6">
          <p className="text-xs uppercase tracking-[0.14em] text-ink-muted mb-2">Post preview</p>
          {post.heading && <p className="font-medium text-ink mb-1">{post.heading}</p>}
          <p className="text-sm text-ink line-clamp-4">{post.content}</p>
        </div>

        {existingPromotion && (
          <div className="rounded-xl border border-border bg-surface dark:bg-[#121114] p-4 mb-6">
            <p className={`text-sm font-medium ${STATUS_COPY[existingPromotion.status].tone}`}>
              {STATUS_COPY[existingPromotion.status].label}
            </p>
            <p className="text-xs text-ink-muted mt-1">
              {formatUsd(existingPromotion.daily_budget_usd)}/day &middot; {existingPromotion.duration_days} day
              {existingPromotion.duration_days === 1 ? "" : "s"} &middot; {formatUsd(existingPromotion.total_charged_usd)} total
            </p>
            {existingPromotion.status === "declined" && existingPromotion.admin_feedback && (
              <p className="text-sm text-ink mt-2 bg-canvas rounded-lg p-2">
                "{existingPromotion.admin_feedback}"
              </p>
            )}
            {existingPromotion.status === "approved" && existingPromotion.give_back_usd != null && (
              <p className="text-xs text-ink-muted mt-2">
                Give Back: {formatUsd(existingPromotion.give_back_usd)}
              </p>
            )}

            {canManage && (
              <div className="mt-3 pt-3 border-t border-border space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pausePromotion.isPending || resumePromotion.isPending}
                    onClick={handlePauseToggle}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-accent-soft text-accent hover:bg-accent-soft/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {existingPromotion.status === "paused" ? (
                      <>
                        <Play size={14} className="mr-1.5" />
                        {resumePromotion.isPending ? "Resuming…" : "Resume"}
                      </>
                    ) : (
                      <>
                        <Pause size={14} className="mr-1.5" />
                        {pausePromotion.isPending ? "Pausing…" : "Pause"}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExtendForm((s) => !s)}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-accent-soft text-accent hover:bg-accent-soft/70 transition-colors"
                  >
                    <TimerReset size={14} className="mr-1.5" /> Extend
                  </button>
                  <button
                    type="button"
                    disabled={terminatePromotion.isPending}
                    onClick={handleTerminate}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-danger/10 text-danger hover:bg-danger/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <XCircle size={14} className="mr-1.5" />
                    {terminatePromotion.isPending ? "Ending…" : "End campaign"}
                  </button>
                </div>

                {showExtendForm && (
                  <form onSubmit={handleExtend} className="flex items-end gap-2">
                    <div className="flex-1">
                      <FormField
                        id="extend-days"
                        label="Additional days"
                        type="number"
                        min={1}
                        step="1"
                        value={extendDays}
                        onChange={(e) => setExtendDays(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-ink-muted pb-2.5 whitespace-nowrap">
                      +{formatUsd((Number(extendDays) || 0) * existingPromotion.daily_budget_usd)}
                    </p>
                    <button
                      type="submit"
                      disabled={extendPromotion.isPending}
                      className="px-3 py-2 rounded-lg text-sm font-medium bg-accent text-canvas hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {extendPromotion.isPending ? "Adding…" : "Add"}
                    </button>
                  </form>
                )}

                {lifecycleError && (
                  <p className="text-danger text-sm" role="alert">
                    {lifecycleError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {hasActiveCampaign ? (
          <p className="text-sm text-ink-muted">
            This post already has {existingPromotion?.status === "pending" ? "a campaign awaiting review" : "an active campaign"}.
            {existingPromotion?.status === "pending" && " You can submit a new one once this is reviewed."}
          </p>
        ) : !promotionsEnabled ? (
          <p className="text-sm text-ink-muted">Post promotions are temporarily unavailable. Check back later.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <FormField
              id="daily-budget"
              label={`Daily budget (USD, ${formatUsd(PROMOTION_DAILY_BUDGET_MIN_USD)}\u2013${formatUsd(PROMOTION_DAILY_BUDGET_MAX_USD)})`}
              type="number"
              min={PROMOTION_DAILY_BUDGET_MIN_USD}
              max={PROMOTION_DAILY_BUDGET_MAX_USD}
              step="0.01"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              required
            />

            <FormField
              id="duration-days"
              label={`Duration (days, ${PROMOTION_DURATION_MIN_DAYS}\u2013${PROMOTION_DURATION_MAX_DAYS})`}
              type="number"
              min={PROMOTION_DURATION_MIN_DAYS}
              max={PROMOTION_DURATION_MAX_DAYS}
              step="1"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              required
            />

            <div className="mb-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted mb-2.5">
                Audience interests (optional)
              </p>
              <p className="text-xs text-ink-muted mb-3">
                Leave blank to reach everyone. Pick a few to focus your budget on people interested
                in those topics.
              </p>
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {categories?.map((category) => (
                  <div key={category.id}>
                    <p className="text-xs font-medium text-ink-muted mb-1.5">{category.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {category.interests.map((interest) => {
                        const isSelected = selectedInterests.has(interest.id);
                        return (
                          <button
                            key={interest.id}
                            type="button"
                            onClick={() => toggleInterest(interest.id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                              isSelected
                                ? "bg-accent text-canvas border-accent"
                                : "bg-surface text-ink border-border hover:border-accent/50"
                            }`}
                          >
                            {interest.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface dark:bg-[#121114] p-4 mb-4 flex items-center justify-between">
              <span className="text-sm text-ink-muted">Total charged on submission</span>
              <span className="font-display text-lg text-ink">{formatUsd(totalCost)}</span>
            </div>

            {wallet && (
              <p className="text-xs text-ink-muted mb-4">
                Wallet balance: {formatUsd(wallet.balance)}
              </p>
            )}

            <p className="text-xs text-ink-muted mb-4">
              You'll be charged the full amount now. An admin reviews every campaign before it
              goes live — if it's declined, you're refunded in full and notified with the reason.
            </p>

            {error && (
              <p className="text-danger text-sm mb-4" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" loading={submitPromotion.isPending}>
              Submit for review — {formatUsd(totalCost)}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
