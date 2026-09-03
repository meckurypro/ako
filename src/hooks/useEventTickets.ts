// src/hooks/useEventTickets.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export interface EventTicket {
  id: string;
  project_id: string;
  buyer_id: string;
  recipient_email: string;
  ticket_code: string;
  ticket_image_url: string | null;
  email_sent_at: string | null;
  refunded_at: string | null;
  created_at: string;
}

// NOTE: ticket rows are only ever created by the purchase-project
// edge function (service role) — see event_tickets RLS, which has no
// client INSERT policy at all. That edge function doesn't issue
// tickets yet (still generic purchase logic), so this will read back
// nothing until that backend piece lands. Wiring it up now anyway so
// the UI is ready the moment it does.
export function useMyEventTicket(projectId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-event-ticket", projectId, user?.id],
    queryFn: async (): Promise<EventTicket | null> => {
      const { data, error } = await supabase
        .from("event_tickets")
        .select("*")
        .eq("project_id", projectId)
        .eq("buyer_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!user,
  });
}

// Host view — how many tickets sold, for the manage/overview screen.
export function useEventTicketHolders(projectId: string | undefined) {
  return useQuery({
    queryKey: ["event-ticket-holders", projectId],
    queryFn: async (): Promise<EventTicket[]> => {
      const { data, error } = await supabase
        .from("event_tickets")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });
}
