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
}

export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async (): Promise<NotificationWithActor[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select(`*, actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url)`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as NotificationWithActor[];
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
