// src/hooks/useProjectTypeDetails.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export interface EventDetails {
  project_id: string;
  event_date: string | null;
  location_type: "physical" | "online";
  location_value: string;
  ticket_template_url: string | null;
}

export interface MeetingDetails {
  project_id: string;
  scheduled_at: string;
  provider_room_id: string | null;
  status: "scheduled" | "live" | "ended" | "cancelled";
  recording_url: string | null;
}

// Both tables are publicly readable (see ako_projects_v2_rls.sql) —
// this is browsing info shown before anyone pays.
export function useEventDetails(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-event-details", projectId],
    queryFn: async (): Promise<EventDetails | null> => {
      const { data, error } = await supabase
        .from("project_event_details")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useMeetingDetails(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-meeting-details", projectId],
    queryFn: async (): Promise<MeetingDetails | null> => {
      const { data, error } = await supabase
        .from("project_meeting_details")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

