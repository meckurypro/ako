import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onlineManager, type QueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const OFFLINE_QUEUE_KEY = "ako.offline.queue.v1";
const MAX_ATTEMPTS = 8;

export type OfflineWrite =
  | { op: "send-message"; conversationId: string; senderId: string; content: string; replyToMessageId?: string | null; localId?: string; createdAt?: string }
  | { op: "create-post"; input: { heading?: string; content: string; interest_ids: string[]; media_urls: string[]; status?: "draft" | "scheduled"; scheduled_for?: string; posted_as_page_id?: string } }
  | { op: "create-comment"; postId: string; input: { content: string; stance?: string; parent_comment_id?: string } }
  | { op: "toggle-reaction"; postId: string; userId: string; type: "like" | "dislike"; active: boolean }
  | { op: "toggle-bookmark"; postId: string; userId: string; active: boolean }
  | { op: "toggle-follow"; userId: string; targetId: string; isPrivate: boolean; following: boolean; requested: boolean }
  | { op: "toggle-page-follow"; userId: string; pageId: string; active: boolean };

type QueueItem = { id: string; write: OfflineWrite; createdAt: string; attempts: number; lastError?: string };
let currentOnline = true;
let flushing = false;
let started = false;

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isOnline() {
  return currentOnline;
}

export function useNetworkStatus() {
  const [online, setOnline] = useState(currentOnline);
  useEffect(() => {
    if (Platform.OS === "web") return undefined;
    const update = (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => {
      setOnline(state.isConnected === true && state.isInternetReachable !== false);
    };
    const unsubscribe = NetInfo.addEventListener(update);
    void NetInfo.fetch().then(update);
    return unsubscribe;
  }, []);
  return online;
}

export function offlineId(prefix = "offline") {
  return `${prefix}-${id()}`;
}

export function isNetworkError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error ?? "");
  return /network|fetch|offline|timeout|abort|internet|connection|econn|enotfound|failed to fetch/i.test(text);
}

async function readQueue(): Promise<QueueItem[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueueItem[]) {
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
}

export async function enqueueOfflineWrite(write: OfflineWrite) {
  const items = await readQueue();
  items.push({ id: id(), write, createdAt: new Date().toISOString(), attempts: 0 });
  await writeQueue(items);
}

async function perform(write: OfflineWrite) {
  switch (write.op) {
    case "send-message": {
      const { error } = await supabase.from("messages").insert({
        conversation_id: write.conversationId,
        sender_id: write.senderId,
        content: write.content,
        reply_to_message_id: write.replyToMessageId ?? null,
        delivered_at: new Date().toISOString(),
      });
      if (error) throw error;
      await supabase.from("conversation_participants").update({ is_request: false, archived_at: null }).eq("conversation_id", write.conversationId).eq("user_id", write.senderId);
      return;
    }
    case "create-post": {
      const { posted_as_page_id, ...body } = write.input;
      const result = posted_as_page_id
        ? await supabase.functions.invoke("create-page-post", { body: { ...body, page_id: posted_as_page_id } })
        : await supabase.functions.invoke("create-post", { body });
      if (result.error) throw result.error;
      if (result.data?.error) throw new Error(result.data.error);
      return;
    }
    case "create-comment": {
      const { data, error } = await supabase.functions.invoke("create-comment", { body: { post_id: write.postId, ...write.input } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return;
    }
    case "toggle-reaction": {
      if (write.active) {
        const { error } = await supabase.from("reactions").delete().eq("post_id", write.postId).eq("user_id", write.userId).eq("type", write.type).is("acted_as_page_id", null);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reactions").insert({ post_id: write.postId, user_id: write.userId, type: write.type, target_type: "post", acted_as_page_id: null });
        if (error && error.code !== "23505") throw error;
      }
      return;
    }
    case "toggle-bookmark": {
      if (write.active) {
        const { error } = await supabase.from("bookmarks").delete().eq("post_id", write.postId).eq("user_id", write.userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bookmarks").insert({ post_id: write.postId, user_id: write.userId });
        if (error && error.code !== "23505") throw error;
      }
      return;
    }
    case "toggle-follow": {
      if (write.following) {
        const { error } = await supabase.from("follows").delete().eq("follower_id", write.userId).eq("following_id", write.targetId);
        if (error) throw error;
      } else if (write.requested) {
        const { error } = await supabase.from("follow_requests").delete().eq("requester_id", write.userId).eq("target_id", write.targetId);
        if (error) throw error;
      } else if (write.isPrivate) {
        const { error } = await supabase.from("follow_requests").insert({ requester_id: write.userId, target_id: write.targetId });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: write.userId, following_id: write.targetId });
        if (error && error.code !== "23505") throw error;
      }
      return;
    }
    case "toggle-page-follow": {
      if (write.active) {
        const { error } = await supabase.from("page_follows").delete().eq("follower_id", write.userId).eq("page_id", write.pageId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("page_follows").insert({ follower_id: write.userId, page_id: write.pageId });
        if (error && error.code !== "23505") throw error;
      }
    }
  }
}

export async function flushOfflineQueue(queryClient?: QueryClient) {
  if (flushing || !currentOnline) return;
  flushing = true;
  try {
    const items = await readQueue();
    const remaining: QueueItem[] = [];
    for (const item of items) {
      try {
        await perform(item.write);
      } catch (error) {
        const attempts = item.attempts + 1;
        if (!isNetworkError(error) && attempts >= MAX_ATTEMPTS) continue;
        remaining.push({ ...item, attempts, lastError: error instanceof Error ? error.message : String(error) });
        if (isNetworkError(error)) break;
      }
    }
    await writeQueue(remaining);
    if (items.length !== remaining.length) {
      await Promise.all([
        queryClient?.invalidateQueries({ queryKey: ["feed"] }),
        queryClient?.invalidateQueries({ queryKey: ["identity-posts"] }),
        queryClient?.invalidateQueries({ queryKey: ["mobile-conversations"] }),
        queryClient?.invalidateQueries({ queryKey: ["mobile-messages"] }),
        queryClient?.invalidateQueries({ queryKey: ["comments"] }),
      ]);
    }
  } finally {
    flushing = false;
  }
}

export function startOfflineSync(queryClient: QueryClient) {
  if (started || Platform.OS === "web") return () => {};
  started = true;
  onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((state) => {
    const online = state.isConnected === true && state.isInternetReachable !== false;
    currentOnline = online;
    setOnline(online);
    if (online) void flushOfflineQueue(queryClient);
  }));
  const unsubscribe = NetInfo.addEventListener((state) => {
    const online = state.isConnected === true && state.isInternetReachable !== false;
    currentOnline = online;
    if (online) void flushOfflineQueue(queryClient);
  });
  void NetInfo.fetch().then((state) => {
    currentOnline = state.isConnected === true && state.isInternetReachable !== false;
    if (currentOnline) void flushOfflineQueue(queryClient);
  });
  return unsubscribe;
}
