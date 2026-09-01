import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export interface ConversationSummary {
  id: string;
  last_message_at: string;
  other_participant: { id: string; username: string; display_name: string; avatar_url: string | null };
  last_message: { content: string; sender_id: string } | null;
  unread: boolean;
}

/**
 * Lists the current user's conversations, newest first, with enough
 * info to render a conversation list item without extra per-row fetches.
 */
export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async (): Promise<ConversationSummary[]> => {
      const { data: myParticipation, error } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", user!.id);

      if (error) throw error;
      if (!myParticipation?.length) return [];

      const conversationIds = myParticipation.map((p) => p.conversation_id);
      const readMap = new Map(myParticipation.map((p) => [p.conversation_id, p.last_read_at]));

      const { data: conversations, error: convError } = await supabase
        .from("conversations")
        .select("id, last_message_at")
        .in("id", conversationIds)
        .order("last_message_at", { ascending: false });

      if (convError) throw convError;

      const results: ConversationSummary[] = [];

      for (const conv of conversations ?? []) {
        const { data: otherParticipant } = await supabase
          .from("conversation_participants")
          .select("profile:profiles!conversation_participants_user_id_fkey(id, username, display_name, avatar_url)")
          .eq("conversation_id", conv.id)
          .neq("user_id", user!.id)
          .maybeSingle();

        const { data: lastMessage } = await supabase
          .from("messages")
          .select("content, sender_id, created_at")
          .eq("conversation_id", conv.id)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!otherParticipant?.profile) continue;

        const lastReadAt = readMap.get(conv.id);
        // A conversation is only "unread" if the newest message came from
        // the OTHER participant and arrived after we last read the thread.
        // Our own sent messages must never flip this back to unread.
        const unread =
          !!lastMessage &&
          lastMessage.sender_id !== user!.id &&
          (!lastReadAt || new Date(lastMessage.created_at) > new Date(lastReadAt));

        results.push({
          id: conv.id,
          last_message_at: conv.last_message_at,
          other_participant: otherParticipant.profile as any,
          last_message: lastMessage ? { content: lastMessage.content, sender_id: lastMessage.sender_id } : null,
          unread,
        });
      }

      return results;
    },
    enabled: !!user,
    refetchInterval: 15_000, // simple polling fallback alongside the realtime subscription in useMessages
  });
}

export interface MessageWithSender {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

/**
 * Fetches message history and subscribes to new messages via
 * Supabase Realtime, so an open conversation updates live without
 * polling. Falls back gracefully if Realtime isn't enabled on the
 * project — the initial fetch still works either way.
 */
export function useMessages(conversationId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async (): Promise<MessageWithSender[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, content, created_at")
        .eq("conversation_id", conversationId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return query;
}

export function useSendMessage(conversationId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: user.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMarkConversationRead(conversationId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/**
 * Finds or creates a 1:1 conversation with another user, via the
 * get_or_create_direct_conversation() RPC (see 13_direct_messaging.sql) —
 * never inserts into conversations directly.
 */
export function useStartConversation() {
  return useMutation({
    mutationFn: async (otherUserId: string): Promise<string> => {
      const { data, error } = await supabase.rpc("get_or_create_direct_conversation", {
        p_other_user_id: otherUserId,
      });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Total unread conversation count, for the bottom nav badge — mirrors
 * useUnreadCount() from useNotifications.ts, just derived from the
 * conversations list's per-conversation `unread` flag instead of a
 * dedicated query.
 */
export function useUnreadConversationCount(): number {
  const { data: conversations } = useConversations();
  return conversations?.filter((c) => c.unread).length ?? 0;
}
