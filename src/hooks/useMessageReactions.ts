// src/hooks/useMessageReactions.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { DEFAULT_TOP_EMOJIS } from "../lib/emojiData";

export interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
}

/** Reactions for every message in a conversation, keyed by message_id -> list. Kept live via Realtime. */
export function useConversationReactions(conversationId: string, messageIds: string[]) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["message-reactions", conversationId],
    queryFn: async (): Promise<Record<string, MessageReaction[]>> => {
      if (!messageIds.length) return {};
      const { data, error } = await supabase
        .from("message_reactions")
        .select("message_id, user_id, emoji")
        .in("message_id", messageIds);
      if (error) throw error;
      const grouped: Record<string, MessageReaction[]> = {};
      for (const r of data ?? []) {
        (grouped[r.message_id] ??= []).push(r);
      }
      return grouped;
    },
    enabled: messageIds.length > 0,
  });

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`message-reactions:${conversationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        queryClient.invalidateQueries({ queryKey: ["message-reactions", conversationId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return query;
}

export function useSetReaction(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const { error } = await supabase.rpc("set_message_reaction", {
        p_message_id: messageId,
        p_emoji: emoji,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-reactions", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["user-top-emojis"] });
    },
  });
}

export function useRemoveReaction(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase.rpc("remove_message_reaction", { p_message_id: messageId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-reactions", conversationId] });
    },
  });
}

/**
 * The 12 emojis for the reaction pill — the user's personal most-used
 * (by use_count, tie-broken by recency), padded with defaults if they
 * haven't reacted with 12 distinct emojis yet.
 */
export function useUserTopEmojis(): string[] {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["user-top-emojis", user?.id],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("user_emoji_usage")
        .select("emoji")
        .eq("user_id", user!.id)
        .order("use_count", { ascending: false })
        .order("last_used_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []).map((r) => r.emoji);
    },
    enabled: !!user,
  });

  const tracked = data ?? [];
  const padded = [...tracked];
  for (const fallback of DEFAULT_TOP_EMOJIS) {
    if (padded.length >= 12) break;
    if (!padded.includes(fallback)) padded.push(fallback);
  }
  return padded.slice(0, 12);
}

/**
 * Up to `limit` emoji the user has actually used, most-recent-first —
 * for the full emoji picker's "Recents" section. Unlike
 * useUserTopEmojis, this is NOT padded with defaults: an empty result
 * means the section should be hidden entirely.
 */
export function useRecentEmojis(limit = 36): string[] {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["recent-emojis", user?.id, limit],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("user_emoji_usage")
        .select("emoji")
        .eq("user_id", user!.id)
        .order("last_used_at", { ascending: false })
        .order("use_count", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((r) => r.emoji);
    },
    enabled: !!user,
  });

  return data ?? [];
}

export interface MessageUserState {
  message_id: string;
  starred_at: string | null;
  pinned_at: string | null;
}

export function useMessageUserStates(conversationId: string, messageIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["message-user-state", conversationId, user?.id],
    queryFn: async (): Promise<Record<string, MessageUserState>> => {
      if (!messageIds.length || !user) return {};
      const { data, error } = await supabase
        .from("message_user_state")
        .select("message_id, starred_at, pinned_at")
        .in("message_id", messageIds)
        .eq("user_id", user.id);
      if (error) throw error;
      const map: Record<string, MessageUserState> = {};
      for (const row of data ?? []) map[row.message_id] = row;
      return map;
    },
    enabled: messageIds.length > 0 && !!user,
  });
}

export function useToggleMessageState(conversationId: string, field: "starred_at" | "pinned_at") {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, active }: { messageId: string; active: boolean }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("message_user_state")
        .upsert(
          { message_id: messageId, user_id: user.id, [field]: active ? new Date().toISOString() : null },
          { onConflict: "message_id,user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-user-state", conversationId] });
    },
  });
    }
