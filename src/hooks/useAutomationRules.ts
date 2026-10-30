// src/hooks/useAutomationRules.ts
// Global automation rules (not per account). Today: reciprocity auto-follow, see
// supabase/ako_automation_reciprocity_follow.sql. Admin only by RLS.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export interface ReciprocityRule {
  enabled: boolean;
  /** Engagements the automated account must have made with the other account. */
  outgoing_min: number;
  /** Engagements the other account must have made back. */
  reciprocal_min: number;
}

export const RECIPROCITY_DEFAULTS: ReciprocityRule = { enabled: true, outgoing_min: 100, reciprocal_min: 50 };

export interface ReciprocityFollowEntry {
  id: string;
  follower_id: string;
  following_id: string;
  outgoing_count: number;
  reciprocal_count: number;
  outgoing_min: number;
  reciprocal_min: number;
  created_at: string;
  follower: { username: string; display_name: string } | null;
  following: { username: string; display_name: string } | null;
}

export function useReciprocityRule() {
  return useQuery({
    queryKey: ["automation", "rule", "reciprocity_follow"],
    queryFn: async (): Promise<ReciprocityRule> => {
      const { data, error } = await supabase
        .from("automation_rules")
        .select("enabled, config")
        .eq("key", "reciprocity_follow")
        .maybeSingle();
      if (error) throw error;
      if (!data) return RECIPROCITY_DEFAULTS;
      const cfg = (data.config ?? {}) as Record<string, unknown>;
      return {
        enabled: data.enabled,
        outgoing_min: typeof cfg.outgoing_min === "number" ? cfg.outgoing_min : RECIPROCITY_DEFAULTS.outgoing_min,
        reciprocal_min: typeof cfg.reciprocal_min === "number" ? cfg.reciprocal_min : RECIPROCITY_DEFAULTS.reciprocal_min,
      };
    },
  });
}

export function useSaveReciprocityRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rule: ReciprocityRule) => {
      const { error } = await supabase.from("automation_rules").upsert({
        key: "reciprocity_follow",
        enabled: rule.enabled,
        config: { outgoing_min: rule.outgoing_min, reciprocal_min: rule.reciprocal_min },
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation", "rule", "reciprocity_follow"] }),
  });
}

export function useReciprocityFollowLog() {
  return useQuery({
    queryKey: ["automation", "rule", "reciprocity_follow", "log"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<ReciprocityFollowEntry[]> => {
      const { data, error } = await supabase
        .from("automation_follow_log")
        .select("id, follower_id, following_id, outgoing_count, reciprocal_count, outgoing_min, reciprocal_min, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.flatMap((r) => [r.follower_id, r.following_id])));
      const names = new Map<string, { username: string; display_name: string }>();
      if (ids.length > 0) {
        const { data: profiles, error: pErr } = await supabase.from("profiles").select("id, username, display_name").in("id", ids);
        if (pErr) throw pErr;
        for (const p of profiles ?? []) names.set(p.id, { username: p.username, display_name: p.display_name });
      }
      return rows.map((r) => ({
        ...r,
        follower: names.get(r.follower_id) ?? null,
        following: names.get(r.following_id) ?? null,
      }));
    },
  });
}

/** Runs the sweep now instead of waiting for the next 10 minute pass. */
export function useRunReciprocityFollowNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ status: string; checked?: number; followed?: number }> => {
      const { data, error } = await supabase.rpc("admin_run_reciprocity_follow");
      if (error) throw error;
      return data as { status: string; checked?: number; followed?: number };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation", "rule", "reciprocity_follow", "log"] }),
  });
}
