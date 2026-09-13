// src/hooks/usePromotions.ts
// ============================================================
// Post Promotions — paid ad campaigns for a user's own posts.
//
// Flow: user picks a daily budget + duration (+ optional interest
// targeting) on PromoteComposer, submits, is charged the full
// campaign amount immediately (submit-promotion edge function ->
// submit_promotion() DB function), then waits for admin review
// (AdminPromotions -> review-promotion edge function ->
// review_promotion() DB function). A decline fully refunds the
// charge; an approval requires the admin to set a Give Back amount
// first and does not charge again.
//
// Scope note: this only covers the request/charge/review/refund
// workflow, not the actual feed-distribution mechanism for an
// approved campaign — see the migration comment for
// add_post_promotions.
// ============================================================
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export const PROMOTION_DAILY_BUDGET_MIN_USD = 5;
export const PROMOTION_DAILY_BUDGET_MAX_USD = 1000;
export const PROMOTION_DURATION_MIN_DAYS = 1;
export const PROMOTION_DURATION_MAX_DAYS = 30;

export type PromotionStatus = "pending" | "approved" | "declined" | "completed" | "cancelled";

export interface Promotion {
  id: string;
  post_id: string;
  user_id: string;
  status: PromotionStatus;
  daily_budget_usd: number;
  duration_days: number;
  total_charged_usd: number;
  interest_ids: string[];
  give_back_usd: number | null;
  admin_feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface AdminPromotion extends Promotion {
  promoter: { username: string; display_name: string; avatar_url: string | null };
  post: { id: string; content: string; heading: string | null };
}

const PROMOTION_SELECT =
  "id, post_id, user_id, status, daily_budget_usd, duration_days, total_charged_usd, interest_ids, give_back_usd, admin_feedback, reviewed_by, reviewed_at, starts_at, ends_at, created_at";

/**
 * The current (most recent) promotion for a specific post, if any —
 * drives PromoteComposer's "you already have a campaign for this"
 * and "here's the outcome of your last one" states. A post can only
 * ever have one non-terminal (pending/approved) campaign at a time
 * (enforced in submit_promotion()), so "most recent" is unambiguous.
 */
export function usePromotionForPost(postId: string | undefined) {
  return useQuery({
    queryKey: ["promotion-for-post", postId],
    queryFn: async (): Promise<Promotion | null> => {
      const { data, error } = await supabase
        .from("promotions")
        .select(PROMOTION_SELECT)
        .eq("post_id", postId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });
}

/** All of the current user's campaigns, most recent first. */
export function useMyPromotions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-promotions", user?.id],
    queryFn: async (): Promise<Promotion[]> => {
      const { data, error } = await supabase
        .from("promotions")
        .select(PROMOTION_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

interface SubmitPromotionInput {
  post_id: string;
  daily_budget_usd: number;
  duration_days: number;
  interest_ids: string[];
}

/**
 * Calls submit-promotion, which delegates the actual validation,
 * wallet lock, and charge to submit_promotion() — one atomic
 * Postgres function, same shape as useWithdraw -> process-withdrawal
 * -> request_withdrawal(). The wallet balance is affected
 * immediately on success, so both wallet and post-scoped queries
 * need invalidating.
 */
export function useSubmitPromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { blocking: true },
    mutationFn: async (input: SubmitPromotionInput): Promise<Promotion> => {
      const { data, error } = await supabase.functions.invoke("submit-promotion", {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.promotion;
    },
    onSuccess: (promotion) => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["my-promotions"] });
      queryClient.invalidateQueries({ queryKey: ["promotion-for-post", promotion.post_id] });
    },
  });
}

// ------------------------------------------------------------
// Admin side
// ------------------------------------------------------------

/** Pending campaigns awaiting admin review, oldest first (a queue). */
export function usePendingPromotions() {
  return useQuery({
    queryKey: ["pending-promotions"],
    queryFn: async (): Promise<AdminPromotion[]> => {
      const { data, error } = await supabase
        .from("promotions")
        .select(
          `${PROMOTION_SELECT}, promoter:profiles!promotions_user_id_fkey(username, display_name, avatar_url), post:posts!promotions_post_id_fkey(id, content, heading)`
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as AdminPromotion[];
    },
  });
}

interface ReviewPromotionInput {
  promotion_id: string;
  decision: "approve" | "decline";
  give_back_usd?: number;
  admin_feedback?: string;
}

/**
 * Calls review-promotion, which delegates to review_promotion() —
 * approve requires give_back_usd and only flips status/sets the
 * live window (no further charge, the money was taken at
 * submission); decline requires admin_feedback and triggers a full
 * refund to the promoter's wallet inside the same DB transaction.
 */
export function useReviewPromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { blocking: true },
    mutationFn: async (input: ReviewPromotionInput): Promise<Promotion> => {
      const { data, error } = await supabase.functions.invoke("review-promotion", {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.promotion;
    },
    onSuccess: (promotion) => {
      queryClient.invalidateQueries({ queryKey: ["pending-promotions"] });
      queryClient.invalidateQueries({ queryKey: ["promotion-for-post", promotion.post_id] });
    },
  });
}
