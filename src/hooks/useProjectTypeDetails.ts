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

// A 'media' project holds an audio channel, a video channel, or both.
// Each channel is independently either a link out (Spotify/YouTube/etc.)
// or an uploaded file streamed from our own storage — never both at
// once, mirroring the link-vs-upload toggle used elsewhere. Exactly
// one of {audio_url, audio_file_path} is set when has_audio is true
// (same for video); both null when the channel is off.
export interface MediaDetails {
  project_id: string;
  has_audio: boolean;
  has_video: boolean;
  audio_source: "link" | "upload" | null;
  audio_url: string | null;
  audio_file_path: string | null;
  video_source: "link" | "upload" | null;
  video_url: string | null;
  video_file_path: string | null;
}

// Publicly readable, same as event/meeting details above. Note that
// *_file_path values are private-bucket storage paths, not usable
// URLs on their own — same safety property projects.file_path
// already relies on — so exposing them here is harmless; only
// get-project-file (service role) can turn one into a signed,
// time-limited streaming URL after checking access.
export function useMediaDetails(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-media-details", projectId],
    queryFn: async (): Promise<MediaDetails | null> => {
      const { data, error } = await supabase
        .from("project_media_details")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}
