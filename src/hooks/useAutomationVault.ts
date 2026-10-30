// src/hooks/useAutomationVault.ts
// Admin "Idea vault" for Automate posts: the one global place ideas are pasted, the System Bot that places each idea
// with the account it suits, and the rotation history. Tables, rules and cron: supabase/ako_automation_global_vault.sql.
// Placement itself runs in the assign-vault-ideas edge function. Everything here is admin-only by RLS.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { AiProvider } from "./useAutomation";

export interface SystemBot {
  ai_provider: AiProvider;
  ai_model: string | null;
  api_key_last4: string | null;
  is_enabled: boolean;
  /** An idea that is Done is untouchable for everyone for this many months. */
  cooldown_months: number;
  /** An account that already did an idea waits until this many different accounts have done it since. */
  min_other_accounts: number;
  /** An account with this many ideas waiting is given no more. */
  queue_cap: number;
}

export type VaultStatus = "new" | "active" | "unfit" | "retired";

export interface VaultIdea {
  id: string;
  idea: string;
  priority: "normal" | "high";
  status: VaultStatus;
  /** The System Bot's reasoning for its latest decision. */
  fit_note: string | null;
  assessed_at: string | null;
  next_check_at: string | null;
  created_at: string;
}

/** One turn of a vault idea: a row in an account's queue (automation_ideas) that came from the vault. */
export interface VaultTurn {
  id: string;
  vault_id: string;
  account_id: string;
  /** pending = queued, used = Done. */
  status: "pending" | "used" | "archived";
  created_at: string;
  used_at: string | null;
  used_post_id: string | null;
  assigned_by: "system" | "admin" | null;
  assigned_note: string | null;
}

export type PlacementKind = "assigned" | "no_fit" | "unfit" | "waiting" | "skipped" | "error";

export interface PlacementResult {
  vault_id: string;
  outcome: PlacementKind;
  /** Display name of the account the idea went to. */
  account?: string;
  note?: string;
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["automation"] });
}

// ---- System Bot --------------------------------------------------------------------------------------------------

export function useSystemBot() {
  return useQuery({
    queryKey: ["automation", "system-bot"],
    queryFn: async (): Promise<SystemBot | null> => {
      const { data, error } = await supabase
        .from("automation_system_bot")
        .select("ai_provider, ai_model, api_key_last4, is_enabled, cooldown_months, min_other_accounts, queue_cap")
        .maybeSingle();
      if (error) throw error;
      return (data as SystemBot | null) ?? null;
    },
  });
}

export function useSaveSystemBotAi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ provider, model, apiKey }: { provider: AiProvider; model: string; apiKey: string }) => {
      const { data, error } = await supabase.rpc("automation_set_system_ai", {
        p_provider: provider,
        p_model: model.trim() || null,
        p_key: apiKey.trim() || null,
      });
      if (error) throw error;
      return data as { key_saved: boolean; key_removed: boolean; paused: boolean };
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useClearSystemBotKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("automation_clear_system_key");
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useSaveSystemBotSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (s: { enabled: boolean; cooldownMonths: number; minOthers: number; queueCap: number }) => {
      const { error } = await supabase.rpc("automation_set_system_bot_settings", {
        p_enabled: s.enabled,
        p_cooldown_months: s.cooldownMonths,
        p_min_others: s.minOthers,
        p_queue_cap: s.queueCap,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

// ---- Vault ideas -------------------------------------------------------------------------------------------------

export function useVaultIdeas() {
  return useQuery({
    queryKey: ["automation", "vault"],
    queryFn: async (): Promise<VaultIdea[]> => {
      const { data, error } = await supabase
        .from("automation_vault")
        .select("id, idea, priority, status, fit_note, assessed_at, next_check_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VaultIdea[];
    },
  });
}

export function useVaultTurns() {
  return useQuery({
    queryKey: ["automation", "vault-turns"],
    queryFn: async (): Promise<VaultTurn[]> => {
      const { data, error } = await supabase
        .from("automation_ideas")
        .select("id, vault_id, account_id, status, created_at, used_at, used_post_id, assigned_by, assigned_note")
        .not("vault_id", "is", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as VaultTurn[];
    },
  });
}

async function place(vaultId: string): Promise<PlacementResult> {
  const { data, error } = await supabase.functions.invoke("assign-vault-ideas", {
    body: { mode: "assign", vault_id: vaultId },
  });
  if (error) throw new Error("Couldn't reach the System Bot. Please try again.");
  if (!data?.ok) throw new Error(data?.error ?? "The System Bot couldn't place this idea.");
  return data.result as PlacementResult;
}

/** Saves a new idea, then (when asked) has the System Bot place it straight away. */
export function useAddVaultIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      idea,
      priority,
      placeNow,
    }: {
      idea: string;
      priority: "normal" | "high";
      placeNow: boolean;
    }): Promise<{ id: string; placement: PlacementResult | null; placementError: string | null }> => {
      const { data, error } = await supabase.from("automation_vault").insert({ idea, priority }).select("id").single();
      if (error) throw error;
      const id = (data as { id: string }).id;
      if (!placeNow) return { id, placement: null, placementError: null };
      try {
        return { id, placement: await place(id), placementError: null };
      } catch (err) {
        // The idea is saved either way; the hourly sweep will place it.
        return { id, placement: null, placementError: err instanceof Error ? err.message : "Couldn't place it yet." };
      }
    },
    onSettled: () => invalidate(queryClient),
  });
}

export function usePlaceVaultIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vaultId: string) => place(vaultId),
    onSettled: () => invalidate(queryClient),
  });
}

export function useRunVaultSweep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<PlacementResult[]> => {
      const { data, error } = await supabase.functions.invoke("assign-vault-ideas", { body: { mode: "sweep" } });
      if (error) throw new Error("Couldn't reach the System Bot. Please try again.");
      if (!data?.ok) throw new Error(data?.error ?? "The sweep failed.");
      return (data.results ?? []) as PlacementResult[];
    },
    onSettled: () => invalidate(queryClient),
  });
}

export function useUpdateVaultIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<VaultIdea, "status" | "priority" | "idea">>;
    }) => {
      // Restoring or retrying an idea clears the System Bot's old verdict so it is looked at fresh.
      const reset = patch.status === "new" || patch.status === "active" ? { next_check_at: null } : {};
      const { error } = await supabase
        .from("automation_vault")
        .update({ ...patch, ...reset })
        .eq("id", id);
      if (error) throw error;

      // Retiring takes the idea out of rotation, so a copy still waiting in an account's queue must not be posted.
      if (patch.status === "retired") {
        const { error: queueError } = await supabase
          .from("automation_ideas")
          .update({ status: "archived" })
          .eq("vault_id", id)
          .eq("status", "pending");
        if (queueError) throw queueError;
      }
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteVaultIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automation_vault").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient),
  });
}
