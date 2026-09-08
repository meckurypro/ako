// src/hooks/useProjectTypeDetails.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Project } from "./useProjects";

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
  // Requires the recording_enabled column added by the
  // ako_projects_v5_meeting_infra migration — defaults to false via
  // `?? false` wherever read, same pattern as Course's is_free_preview.
  recording_enabled: boolean;
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
      return data ? { ...data, recording_enabled: data.recording_enabled ?? false } : null;
    },
    enabled: !!projectId,
  });
}

// A 'media' project holds an audio channel, a video channel, an image
// channel, or any combination of the three. Audio/video are hybrid:
// *_url (a redirect to the full thing elsewhere — Spotify, YouTube)
// and *_file_path (an uploaded clip played in-app as a capped ~20s
// preview, see ProjectCard's MediaPreviewPlayer) are independent —
// either, both, or neither can be set per channel, not one-or-the-
// other. audio_source/video_source are vestigial (kept for backward
// compatibility with older rows) and no longer drive display logic —
// what's actually shown is derived straight from which of {url,
// file_path} are non-null. Image is upload-only: image_file_path is
// the full image shown in-app, and image_url/image_source are no
// longer written by the app (may still hold values on old rows).
// All fields null when the matching has_* flag is false.
export interface MediaDetails {
  project_id: string;
  has_audio: boolean;
  has_video: boolean;
  has_image: boolean;
  audio_source: "link" | "upload" | null;
  audio_url: string | null;
  audio_file_path: string | null;
  video_source: "link" | "upload" | null;
  video_url: string | null;
  video_file_path: string | null;
  image_source: "link" | "upload" | null;
  image_url: string | null;
  image_file_path: string | null;
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

export interface GigDetails {
  project_id: string;
  tagline: string | null;
  delivery_estimate: string | null;
}

// Publicly readable, same as event/meeting/media above.
export function useGigDetails(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-gig-details", projectId],
    queryFn: async (): Promise<GigDetails | null> => {
      const { data, error } = await supabase
        .from("project_gig_details")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

// A gig's proof-of-work samples, in display order. Two-step fetch
// (sample ids, then the projects themselves) rather than a
// PostgREST embed — keeps this independent of the exact FK
// constraint name in the DB.
export function useGigSamples(gigProjectId: string | undefined) {
  return useQuery({
    queryKey: ["project-gig-samples", gigProjectId],
    queryFn: async (): Promise<Project[]> => {
      const { data: links, error: linksError } = await supabase
        .from("project_gig_samples")
        .select("sample_project_id, sort_order")
        .eq("gig_project_id", gigProjectId)
        .order("sort_order");
      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      const ids = links.map((l) => l.sample_project_id);
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .in("id", ids);
      if (projectsError) throw projectsError;

      // Preserve the sort_order from project_gig_samples — the .in()
      // query above doesn't guarantee row order.
      const byId = new Map((projects ?? []).map((p) => [p.id, p as Project]));
      return links.map((l) => byId.get(l.sample_project_id)).filter((p): p is Project => !!p);
    },
    enabled: !!gigProjectId,
  });
}
