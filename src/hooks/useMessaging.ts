// src/hooks/useMessaging.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export interface ConversationSummary {
  id: string;
  last_message_at: string;
  pinned_at: string | null;
  archived_at: string | null;
  other_participant: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    last_seen_at: string | null;
  };
  last_message: {
    content: string;
    sender_id: string;
    delivered_at: string | null;
    read_at: string | null;
    // True when this preview is a tombstone ("deleted for everyone") —
    // list/archive rows should render the "message was deleted" label
    // instead of `content` in that case (content is kept for callers
    // that don't care, same as the thread view).
    is_deleted: boolean;
  } | null;
  unread: boolean;
}

/**
 * Finds the most recent message in a conversation that's actually
 * visible to `userId` — skipping any message they've hidden or deleted
 * for themselves (message_user_state), but NOT skipping a tombstone
 * ("deleted for everyone"): that still shows as the preview, same as
 * it still occupies a slot in the open thread. Looks back up to 10
 * messages before giving up, which comfortably covers a user hiding/
 * deleting a small run of recent messages without a full table scan.
 */
async function getVisibleLastMessage(conversationId: string, userId: string) {
  const { data: recent, error } = await supabase
    .from("messages")
    .select("id, content, sender_id, created_at, delivered_at, read_at, is_deleted")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error || !recent?.length) return null;

  const { data: states } = await supabase
    .from("message_user_state")
    .select("message_id, hidden_at, deleted_for_me_at")
    .eq("user_id", userId)
    .in(
      "message_id",
      recent.map((m) => m.id)
    );
  const excluded = new Set((states ?? []).filter((s) => s.hidden_at || s.deleted_for_me_at).map((s) => s.message_id));

  return recent.find((m) => !excluded.has(m.id)) ?? null;
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
        .select("conversation_id, last_read_at, archived_at, pinned_at, hidden_at")
        .eq("user_id", user!.id);

      if (error) throw error;
      if (!myParticipation?.length) return [];

      // "Deleted" chats are hidden for this user only. Archived chats
      // (manual archives, and pending message requests from people who
      // don't follow the user back — see is_request) are also kept out
      // of the main list here; see useArchivedConversations for the
      // Archive screen that surfaces them.
      const visible = myParticipation.filter((p) => !p.hidden_at && !p.archived_at);
      if (!visible.length) return [];

      const conversationIds = visible.map((p) => p.conversation_id);
      const readMap = new Map(visible.map((p) => [p.conversation_id, p.last_read_at]));
      const pinMap = new Map(visible.map((p) => [p.conversation_id, p.pinned_at]));

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
          .select(
            "profile:profiles!conversation_participants_user_id_fkey(id, username, display_name, avatar_url, last_seen_at)"
          )
          .eq("conversation_id", conv.id)
          .neq("user_id", user!.id)
          .maybeSingle();

        const lastMessage = await getVisibleLastMessage(conv.id, user!.id);

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
          pinned_at: pinMap.get(conv.id) ?? null,
          archived_at: null, // archived ones are already filtered out above
          other_participant: otherParticipant.profile as any,
          last_message: lastMessage
            ? {
                content: lastMessage.content,
                sender_id: lastMessage.sender_id,
                delivered_at: lastMessage.delivered_at,
                read_at: lastMessage.read_at,
                is_deleted: lastMessage.is_deleted,
              }
            : null,
          unread,
        });
      }

      // Pinned conversations float to the top; recency order (already
      // applied by the query above) is preserved within each group
      // since Array.sort is stable.
      results.sort((a, b) => (b.pinned_at ? 1 : 0) - (a.pinned_at ? 1 : 0));

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
  delivered_at: string | null;
  read_at: string | null;
  reply_to_message_id: string | null;
  // "Deleted for everyone" — the row stays in the thread for BOTH
  // participants but renders as a tombstone ("This message was
  // deleted") instead of its content. Set only by the sender (see
  // useDeleteMessage's "everyone" scope). Distinct from a message being
  // hidden or deleted-for-me, which are per-user and filtered out of
  // this list entirely client-side (see MessageThread's use of
  // useMessageUserStates' hidden_at/deleted_for_me_at).
  is_deleted: boolean;
  // Embedded snippet of the message being replied to, if any —
  // Supabase returns the self-join as an array even for a single FK,
  // so callers should read reply_to?.[0].
  reply_to: { id: string; content: string; sender_id: string; is_deleted: boolean }[] | null;
}

/**
 * Fetches message history and subscribes to new messages via
 * Supabase Realtime, so an open conversation updates live without
 * polling. Falls back gracefully if Realtime isn't enabled on the
 * project — the initial fetch still works either way.
 *
 * Deliberately does NOT filter out is_deleted rows anymore — a message
 * deleted "for everyone" must still occupy its slot in the thread as a
 * tombstone for both participants (see MessageWithSender.is_deleted).
 * Messages hidden or deleted-for-me are per-user and filtered out by
 * the caller (MessageThread) using useMessageUserStates, not here.
 */
export function useMessages(conversationId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async (): Promise<MessageWithSender[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `id, conversation_id, sender_id, content, created_at, delivered_at, read_at, reply_to_message_id, is_deleted,
           reply_to:messages!messages_reply_to_message_id_fkey(id, content, sender_id, is_deleted)`
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as MessageWithSender[];
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
      .on(
        // Ticks update live for the SENDER when the recipient's client
        // stamps delivered_at/read_at (see useGlobalMessageDelivery and
        // useMarkMessagesRead below) — without this, the sender would
        // only see their own tick state change on next poll/refetch.
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
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
    mutationFn: async (input: string | { content: string; replyToMessageId?: string | null }) => {
      if (!user) throw new Error("Not signed in");
      const content = typeof input === "string" ? input : input.content;
      const replyToMessageId = typeof input === "string" ? null : input.replyToMessageId ?? null;
      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          reply_to_message_id: replyToMessageId,
        });
      if (error) throw error;

      // Replying accepts a pending message request — moves this
      // conversation out of MY Archive. No-ops for a normal chat, and
      // for the original request sender's own copy (never flagged
      // is_request to begin with, since only the recipient's row is).
      const { error: acceptError } = await supabase
        .from("conversation_participants")
        .update({ is_request: false, archived_at: null })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .eq("is_request", true);
      if (acceptError) console.error("Failed to accept message request:", acceptError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["archived-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["my-participant-state", conversationId] });
    },
  });
}

export type DeleteScope = "me" | "everyone";

/**
 * Deletes one message in one of two scopes:
 *  - "everyone": flips messages.is_deleted (mirrors posts/comments'
 *    soft-delete pattern). RLS should restrict this to
 *    sender_id = auth.uid() at the database level — not re-checked
 *    client-side here, and callers must not offer this scope for a
 *    message that isn't the current user's own.
 *  - "me": stamps message_user_state.deleted_for_me_at for the current
 *    user only. Permanent (no restore, unlike hidden_at) and works on
 *    ANY message regardless of sender — including a tombstone already
 *    deleted "for everyone", which is how a user clears a tombstone out
 *    of their own view after the fact.
 */
export function useDeleteMessage(conversationId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, scope }: { messageId: string; scope: DeleteScope }) => {
      if (scope === "everyone") {
        const { error } = await supabase.from("messages").update({ is_deleted: true }).eq("id", messageId);
        if (error) throw error;
        return;
      }
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("message_user_state")
        .upsert(
          { message_id: messageId, user_id: user.id, deleted_for_me_at: new Date().toISOString() },
          { onConflict: "message_id,user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["message-user-state", conversationId] });
    },
  });
}

/** Bulk version of useDeleteMessage — backs the multi-select delete action. */
export function useBulkDeleteMessages(conversationId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageIds, scope }: { messageIds: string[]; scope: DeleteScope }) => {
      if (!messageIds.length) return;
      if (scope === "everyone") {
        const { error } = await supabase.from("messages").update({ is_deleted: true }).in("id", messageIds);
        if (error) throw error;
        return;
      }
      if (!user) throw new Error("Not signed in");
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("message_user_state")
        .upsert(
          messageIds.map((message_id) => ({ message_id, user_id: user.id, deleted_for_me_at: now })),
          { onConflict: "message_id,user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["message-user-state", conversationId] });
    },
  });
}

/**
 * Forwards one or more messages' content into one or more OTHER
 * conversations, as brand-new messages sent by the current user right
 * now — this is the in-app "share to another user" path (as opposed to
 * MessageActionMenu's onShare, which hands content to the OS share
 * sheet / clipboard for outside the app). Deliberately plain inserts,
 * same shape as useSendMessage, with no reply_to_message_id: a forwarded
 * message isn't a reply, and the source message may not even belong to
 * the target conversation.
 */
export function useForwardMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messages,
      targetConversationIds,
    }: {
      messages: { content: string }[];
      targetConversationIds: string[];
    }) => {
      if (!user) throw new Error("Not signed in");
      if (!messages.length || !targetConversationIds.length) return;

      const rows = targetConversationIds.flatMap((conversation_id) =>
        messages.map((m) => ({
          conversation_id,
          sender_id: user.id,
          content: m.content,
        }))
      );
      const { error } = await supabase.from("messages").insert(rows);
      if (error) throw error;

      // Forwarding into a conversation that was a pending request (rare,
      // but possible if forwarding into an old thread) should accept it
      // the same way a normal reply does — mirrors useSendMessage.
      const { error: acceptError } = await supabase
        .from("conversation_participants")
        .update({ is_request: false, archived_at: null })
        .eq("user_id", user.id)
        .in("conversation_id", targetConversationIds)
        .eq("is_request", true);
      if (acceptError) console.error("Failed to accept message request while forwarding:", acceptError);
    },
    onSuccess: (_data, variables) => {
      for (const id of variables.targetConversationIds) {
        queryClient.invalidateQueries({ queryKey: ["messages", id] });
      }
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["archived-conversations"] });
    },
  });
}

/**
 * Marks all not-yet-read messages from the OTHER participant as read.
 * Call this from the thread page whenever it's mounted/visible and
 * `messages` has loaded — safe to call on every render of that effect,
 * since it only ever touches rows that still have `read_at IS NULL`.
 *
 * Reading implies delivered, so this intentionally doesn't separately
 * backfill delivered_at — MessageStatusTicks treats a present read_at
 * as sufficient on its own (see components/MessageStatusTicks.tsx).
 */
export function useMarkMessagesRead(conversationId: string, messages: MessageWithSender[] | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId || !user || !messages?.length) return;

    const unreadIds = messages.filter((m) => m.sender_id !== user.id && !m.read_at).map((m) => m.id);
    if (!unreadIds.length) return;

    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .is("read_at", null)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to mark messages as read:", error);
          return;
        }
        queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      });
  }, [conversationId, user, messages, queryClient]);
}

/**
 * App-wide delivery tracker. As soon as a message lands via Realtime
 * for ANY conversation this user is part of, stamps delivered_at
 * immediately — this is what makes the grey double-tick appear even
 * before the recipient has opened that specific thread, the same way
 * WhatsApp's single-tick-to-double-tick transition doesn't require you
 * to open the chat.
 *
 * Mount this once near the app root (see components/MessagingPresence.tsx)
 * — do not call it per-conversation, or you'll get duplicate subscriptions.
 */
export function useGlobalMessageDelivery() {
  const { user } = useAuth();

  const { data: conversationIds } = useQuery({
    queryKey: ["my-conversation-ids", user?.id],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.conversation_id);
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!user || !conversationIds?.length) return;

    const channel = supabase
      .channel(`message-delivery:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=in.(${conversationIds.join(",")})`,
        },
        (payload) => {
          const message = payload.new as { id: string; sender_id: string };
          if (message.sender_id === user.id) return; // never mark our own messages "delivered"

          supabase
            .from("messages")
            .update({ delivered_at: new Date().toISOString() })
            .eq("id", message.id)
            .is("delivered_at", null)
            .then(({ error }) => {
              if (error) console.error("Failed to mark message delivered:", error);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // Re-subscribes when the user's conversation list changes (e.g. a
    // new DM thread is started) so new conversations get delivery
    // tracking too, without needing a page reload.
  }, [user, conversationIds]);
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

export interface ConversationStateUpdate {
  conversationId: string;
  pinned_at?: string | null;
  archived_at?: string | null;
  hidden_at?: string | null;
}

/**
 * Pin, archive, or hide ("delete") a conversation — all per-user:
 * this only touches the current user's own conversation_participants
 * row, so it never affects what the other side of the chat sees.
 */
export function useUpdateConversationState() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, ...updates }: ConversationStateUpdate) => {
      if (!user) return;
      const { error } = await supabase
        .from("conversation_participants")
        .update(updates)
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
 * Bulk version of useUpdateConversationState — backs multi-select
 * archive/delete/unarchive on both ConversationList and
 * ArchivedConversations. Same per-user semantics: only ever touches the
 * current user's own conversation_participants rows.
 */
export function useBulkUpdateConversationState() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationIds,
      ...updates
    }: {
      conversationIds: string[];
      pinned_at?: string | null;
      archived_at?: string | null;
      hidden_at?: string | null;
    }) => {
      if (!user || !conversationIds.length) return;
      const { error } = await supabase
        .from("conversation_participants")
        .update(updates)
        .in("conversation_id", conversationIds)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["archived-conversations"] });
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

export interface ArchivedConversationSummary extends ConversationSummary {
  is_request: boolean;
}

/**
 * Everything currently archived for the current user — both manually
 * archived chats and pending message requests (is_request: true, from
 * people who don't follow them back yet). Powers the Archive screen.
 */
export function useArchivedConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["archived-conversations", user?.id],
    queryFn: async (): Promise<ArchivedConversationSummary[]> => {
      const { data: myParticipation, error } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at, is_request")
        .eq("user_id", user!.id)
        .not("archived_at", "is", null)
        .is("hidden_at", null);

      if (error) throw error;
      if (!myParticipation?.length) return [];

      const conversationIds = myParticipation.map((p) => p.conversation_id);
      const readMap = new Map(myParticipation.map((p) => [p.conversation_id, p.last_read_at]));
      const requestMap = new Map(myParticipation.map((p) => [p.conversation_id, p.is_request]));

      const { data: conversations, error: convError } = await supabase
        .from("conversations")
        .select("id, last_message_at")
        .in("id", conversationIds)
        .order("last_message_at", { ascending: false });

      if (convError) throw convError;

      const results: ArchivedConversationSummary[] = [];

      for (const conv of conversations ?? []) {
        const { data: otherParticipant } = await supabase
          .from("conversation_participants")
          .select(
            "profile:profiles!conversation_participants_user_id_fkey(id, username, display_name, avatar_url, last_seen_at)"
          )
          .eq("conversation_id", conv.id)
          .neq("user_id", user!.id)
          .maybeSingle();

        const lastMessage = await getVisibleLastMessage(conv.id, user!.id);

        if (!otherParticipant?.profile) continue;

        const lastReadAt = readMap.get(conv.id);
        const unread =
          !!lastMessage &&
          lastMessage.sender_id !== user!.id &&
          (!lastReadAt || new Date(lastMessage.created_at) > new Date(lastReadAt));

        results.push({
          id: conv.id,
          last_message_at: conv.last_message_at,
          pinned_at: null,
          archived_at: conv.last_message_at, // presence in this list already implies archived; exact value isn't read by the UI
          is_request: requestMap.get(conv.id) ?? false,
          other_participant: otherParticipant.profile as any,
          last_message: lastMessage
            ? {
                content: lastMessage.content,
                sender_id: lastMessage.sender_id,
                delivered_at: lastMessage.delivered_at,
                read_at: lastMessage.read_at,
                is_deleted: lastMessage.is_deleted,
              }
            : null,
          unread,
        });
      }

      return results;
    },
    enabled: !!user,
    refetchInterval: 15_000,
  });
}

/** When the user last opened the Archive screen — drives the badge count below. */
export function useArchiveLastSeenAt() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["archive-last-seen", user?.id],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("archive_last_seen_at")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data.archive_last_seen_at;
    },
    enabled: !!user,
  });
}

/**
 * Call this when the Archive screen mounts. Clears its badge count —
 * items that haven't been replied to yet still stay in the Archive
 * list itself, only the "new" badge clears.
 */
export function useMarkArchiveSeen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ archive_last_seen_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archive-last-seen"] });
    },
  });
}

/**
 * Count for the badge on the Archive row — NOT the bottom nav message
 * icon (that's useUnreadConversationCount above, which deliberately
 * never counts archived/request conversations, since useConversations
 * excludes anything with archived_at set). "New" here means unread and
 * arrived since the user last opened the Archive screen.
 */
export function useArchiveBadgeCount(): number {
  const { data: archived } = useArchivedConversations();
  const { data: lastSeenAt } = useArchiveLastSeenAt();

  if (!archived?.length) return 0;
  return archived.filter(
    (c) => c.unread && (!lastSeenAt || new Date(c.last_message_at) > new Date(lastSeenAt))
  ).length;
}

/**
 * Pin/unpin with a client-side 3-pin cap (mirrored at the DB level by
 * the enforce_pin_limit trigger — see sql/20_message_requests_and_archive.sql
 * — as a backstop against races or other clients). Throws
 * Error("PIN_LIMIT_REACHED") when at the cap; callers should catch that
 * specifically to show a friendly message instead of a raw DB error.
 */
export function useTogglePin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, pin }: { conversationId: string; pin: boolean }) => {
      if (!user) return;

      if (pin) {
        const { count, error: countError } = await supabase
          .from("conversation_participants")
          .select("conversation_id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .not("pinned_at", "is", null);
        if (countError) throw countError;
        if ((count ?? 0) >= 3) throw new Error("PIN_LIMIT_REACHED");
      }

      const { error } = await supabase
        .from("conversation_participants")
        .update({ pinned_at: pin ? new Date().toISOString() : null })
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
 * My own participant state for one conversation — currently just used
 * to know whether I'm looking at a pending message request (see the
 * banner in MessageThread.tsx). Separate small query rather than
 * reusing useConversations' list shape, same reasoning as
 * useOtherParticipant in MessageThread.tsx.
 */
export function useMyParticipantState(conversationId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-participant-state", conversationId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select("is_request, pinned_at, archived_at")
        .eq("conversation_id", conversationId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId && !!user,
  });
}
