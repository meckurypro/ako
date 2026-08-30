import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import type { Profile } from "../types/database";

export function useIsBlocked(targetUserId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-blocked", targetUserId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("blocked_users")
        .select("blocker_id")
        .eq("blocker_id", user.id)
        .eq("blocked_id", targetUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!targetUserId,
  });
}

export function useToggleBlock(targetUserId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (currentlyBlocked: boolean) => {
      if (!user) throw new Error("Not signed in");

      if (currentlyBlocked) {
        const { error } = await supabase
          .from("blocked_users")
          .delete()
          .eq("blocker_id", user.id)
          .eq("blocked_id", targetUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("blocked_users")
          .insert({ blocker_id: user.id, blocked_id: targetUserId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-blocked", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["blocked-list"] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["is-following"] });
    },
  });
}

export function useIsMuted(targetUserId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-muted", targetUserId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("muted_users")
        .select("muter_id")
        .eq("muter_id", user.id)
        .eq("muted_id", targetUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!targetUserId,
  });
}

export function useToggleMute(targetUserId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (currentlyMuted: boolean) => {
      if (!user) throw new Error("Not signed in");

      if (currentlyMuted) {
        const { error } = await supabase
          .from("muted_users")
          .delete()
          .eq("muter_id", user.id)
          .eq("muted_id", targetUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("muted_users")
          .insert({ muter_id: user.id, muted_id: targetUserId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-muted", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["muted-list"] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

export function useBlockedList() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["blocked-list", user?.id],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("blocked_users")
        .select(`blocked:profiles!blocked_users_blocked_id_fkey(*)`)
        .eq("blocker_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((row: any) => row.blocked).filter(Boolean);
    },
    enabled: !!user,
  });
}

export function useMutedList() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["muted-list", user?.id],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("muted_users")
        .select(`muted:profiles!muted_users_muted_id_fkey(*)`)
        .eq("muter_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((row: any) => row.muted).filter(Boolean);
    },
    enabled: !!user,
  });
}

export function useTogglePrivateAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isPrivate: boolean) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({ is_private: isPrivate })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["own-profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

/**
 * Calls deactivate-account — a soft delete + auth ban, never a hard
 * delete (see edge_functions/deactivate-account/index.ts for why:
 * the wallet ledger's ON DELETE RESTRICT constraint makes a true
 * hard-delete unsafe for anyone with financial history).
 */
export function useDeactivateAccount() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("deactivate-account");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });
}
