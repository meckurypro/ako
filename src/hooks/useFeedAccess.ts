// src/hooks/useFeedAccess.ts
//
// Progressive Access: how an account EARNS the Feed. The database does the work
// (see supabase/ako_progressive_feed_access.sql) — pathways are rows in feed_access_rules and
// each is evaluated server-side by evaluate_feed_access(). This file is the client view of it:
//   • useMyFeedAccess  — the signed-in user's progress per pathway (also triggers evaluation,
//                        so reaching a threshold unlocks the Feed the next time they look)
//   • admin hooks      — edit pathways, inspect a user's progress, hold/allow auto-unlock
//
// Eligibility (a pathway is met), Access (account_status = approved) and Privileges
// (verified, tier, …) stay three separate things.
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export interface FeedCondition {
  metric: string;
  label: string;
  op: string;
  current: number;
  required: number;
  met: boolean;
}

export interface FeedPathwayState {
  key: string;
  name: string;
  description: string | null;
  pathway: string;
  logic: "AND" | "OR";
  met: boolean;
  /** 0..1 — AND uses the weakest condition, OR the best one. */
  progress: number;
  conditions: FeedCondition[];
}

export interface FeedAccessStatus {
  gate_enabled: boolean;
  progressive_enabled: boolean;
  account_status: string;
  has_feed_access: boolean;
  /** 'manual' | 'rule:<key>' | null */
  unlocked_by: string | null;
  unlocked_at: string | null;
  auto_unlock_blocked: boolean;
  eligible_rule: string | null;
  rules: FeedPathwayState[];
}

export const PATHWAY_LABELS: Record<string, string> = {
  writer: "Writers",
  resource: "Resources",
  course: "Courses",
  organiser: "Events & meetings",
  artist: "Artists & talent",
  community: "Community",
  other: "Other",
};

/** The pathway the user is closest to finishing — shown first. */
export function closestPathway(rules: FeedPathwayState[]): FeedPathwayState | null {
  if (rules.length === 0) return null;
  return [...rules].sort((a, b) => b.progress - a.progress)[0];
}

export function useMyFeedAccess(opts: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["my-feed-access", user?.id],
    queryFn: async (): Promise<FeedAccessStatus> => {
      // refresh_* evaluates first, so a met pathway unlocks the account right here.
      const { data, error } = await supabase.rpc("refresh_my_feed_access");
      if (error) throw error;
      return data as FeedAccessStatus;
    },
    enabled: !!user && (opts.enabled ?? true),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  // The moment the account flips to approved, re-read the access gate so the Feed appears.
  const hasAccess = query.data?.has_feed_access;
  const unlockedBy = query.data?.unlocked_by;
  useEffect(() => {
    if (hasAccess && unlockedBy) {
      queryClient.invalidateQueries({ queryKey: ["account-access"] });
    }
  }, [hasAccess, unlockedBy, queryClient]);

  return query;
}

// ------------------------------------------------------------------ admin ---------------------

export interface FeedRuleCondition {
  metric: string;
  op: ">=" | ">" | "=" | "<=" | "<";
  value: number;
}

export interface FeedRule {
  key: string;
  name: string;
  description: string | null;
  pathway: string;
  logic: "AND" | "OR";
  conditions: FeedRuleCondition[];
  enabled: boolean;
  sort_order: number;
}

export interface FeedMetric {
  key: string;
  label: string;
  description: string | null;
}

export function useFeedMetrics() {
  return useQuery({
    queryKey: ["feed-access-metrics"],
    queryFn: async (): Promise<FeedMetric[]> => {
      const { data, error } = await supabase
        .from("feed_access_metrics")
        .select("key, label, description")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function useAdminFeedRules() {
  return useQuery({
    queryKey: ["admin-feed-access-rules"],
    queryFn: async (): Promise<FeedRule[]> => {
      const { data, error } = await supabase
        .from("feed_access_rules")
        .select("key, name, description, pathway, logic, conditions, enabled, sort_order")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as FeedRule[];
    },
  });
}

export function useSaveFeedRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rule: FeedRule) => {
      const { error } = await supabase.from("feed_access_rules").upsert(rule, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-feed-access-rules"] }),
  });
}

export function useDeleteFeedRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase.from("feed_access_rules").delete().eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-feed-access-rules"] }),
  });
}

export function useAdminUserFeedAccess(userId: string | null) {
  return useQuery({
    queryKey: ["admin-user-feed-access", userId],
    queryFn: async (): Promise<FeedAccessStatus> => {
      const { data, error } = await supabase.rpc("admin_get_user_feed_access", { p_user_id: userId });
      if (error) throw error;
      return data as FeedAccessStatus;
    },
    enabled: !!userId,
  });
}

export function useSetAutoUnlockBlocked() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, blocked }: { userId: string; blocked: boolean }) => {
      const { error } = await supabase.rpc("admin_set_feed_auto_unlock_blocked", {
        p_user_id: userId,
        p_blocked: blocked,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: ["admin-user-feed-access", v.userId] }),
  });
}
