// src/hooks/usePageNotifications.ts
//
// Page-mode counterpart to useNotifications.ts. A page's Activity bell
// should show notifications ABOUT the page (new followers, comments/
// reactions on posts published as the page, team activity) — separate
// from whichever human is currently acting as that page, and shared by
// every active team member, not just whoever's logged in right now.
//
// BACKEND NOT YET BUILT. This hook is written against a contract that
// doesn't exist in the schema yet — calls will 404/error until it's
// added. Needed on the backend:
//
//   create table public.page_notifications (
//     id uuid primary key default gen_random_uuid(),
//     page_id uuid not null references public.pages(id),
//     type text not null,           -- same vocabulary as notifications.type
//     actor_id uuid references public.profiles(id),
//     target_type text,
//     target_id uuid,
//     preview_text text,
//     read_at timestamptz,
//     created_at timestamptz not null default now()
//   );
//   -- RLS: select/update where exists an active page_members row for
//   -- (page_id, auth.uid()) — i.e. any active team member, not just admins.
//
//   Every trigger that currently inserts into public.notifications for a
//   post/comment engagement needs a companion branch: if the target
//   post's posted_as_page_id is set, insert into page_notifications
//   instead of (or in addition to, for follow/gift events aimed at the
//   page itself) the personal table.
//
// Deliberately a SEPARATE table rather than a nullable page_id column
// on notifications — keeps the existing personal-notifications RLS
// policy untouched and avoids a mutually-exclusive-columns constraint.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { NotificationWithActor } from "./useNotifications";

export function usePageNotifications(pageId: string | undefined) {
  return useQuery({
    queryKey: ["page-notifications", pageId],
    queryFn: async (): Promise<NotificationWithActor[]> => {
      if (!pageId) return [];

      const { data, error } = await supabase
        .from("page_notifications")
        .select(`*, actor:profiles!page_notifications_actor_id_fkey(username, display_name, avatar_url)`)
        .eq("page_id", pageId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as unknown as NotificationWithActor[];
    },
    enabled: !!pageId,
    refetchInterval: 30_000,
  });
}

export function usePageUnreadCount(pageId: string | undefined) {
  const { data } = usePageNotifications(pageId);
  return data?.filter((n) => !n.read_at).length ?? 0;
}

export function useMarkPageNotificationRead(pageId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("page_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-notifications", pageId] });
    },
  });
}

export function useMarkAllPageNotificationsRead(pageId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!pageId) return;
      const { error } = await supabase
        .from("page_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("page_id", pageId)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-notifications", pageId] });
    },
  });
}
