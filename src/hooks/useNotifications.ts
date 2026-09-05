import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export interface NotificationWithActor {
  id: string;
  type: string;
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  preview_text: string | null;
  read_at: string | null;
  created_at: string;
  actor: { username: string; display_name: string; avatar_url: string | null } | null;
  // Only populated for target_type === "comment". notifications.target_id
  // isn't a real FK (target_type/target_id is a generic polymorphic
  // pointer), so this can't be joined in the initial select — it's
  // resolved with a second query below. Lets the notification link
  // straight to `/post/{comment_post_id}#comment-{target_id}` instead of
  // a dead link, since a bare comment id has nowhere to route to on its
  // own. null means "couldn't resolve" (e.g. the comment was deleted).
  comment_post_id?: string | null;
}

export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async (): Promise<NotificationWithActor[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select(`*, actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url)`)
        .eq("user_id", user.id)
        // Message notifications are surfaced via the dedicated message
        // icon (see useUnreadConversationCount in useMessaging.ts), not
        // the notification bell — exclude them here so they aren't
        // double-counted/double-shown.
        .neq("type", "message")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      const notifications = data as unknown as NotificationWithActor[];

      // Resolve the parent post for any comment-target notifications
      // (a reply on your post, or a reply on your comment) in one
      // batched follow-up query, so clicking the notification can jump
      // straight to that comment instead of stopping at target_id with
      // no post to attach it to.
      const commentIds = Array.from(
        new Set(
          notifications
            .filter((n) => n.target_type === "comment" && n.target_id)
            .map((n) => n.target_id as string)
        )
      );

      if (commentIds.length > 0) {
        const { data: commentRows, error: commentsError } = await supabase
          .from("comments")
          .select("id, post_id")
          .in("id", commentIds);
        if (commentsError) throw commentsError;

        const postIdByCommentId = new Map(
          (commentRows ?? []).map((c: any) => [c.id as string, c.post_id as string])
        );

        for (const n of notifications) {
          if (n.target_type === "comment" && n.target_id) {
            n.comment_post_id = postIdByCommentId.get(n.target_id) ?? null;
          }
        }
      }

      return notifications;
    },
    enabled: !!user,
    // Poll periodically — good enough for V1 without wiring a realtime
    // subscription just for the notification bell.
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  const { data: notifications } = useNotifications();
  return notifications?.filter((n) => !n.read_at).length ?? 0;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
