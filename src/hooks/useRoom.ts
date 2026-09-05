// src/hooks/useRoom.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export interface RoomMember {
  project_id: string;
  user_id: string;
  joined_at: string;
}

export interface RoomPost {
  id: string;
  project_id: string;
  sender_id: string;
  type: "text" | "audio" | "video" | "image" | "voice_note";
  content: string | null;
  media_url: string | null;
  downloadable: boolean;
  created_at: string;
}

export interface RoomMeeting {
  id: string;
  project_id: string;
  title: string | null;
  scheduled_at: string;
  provider_room_id: string | null;
  status: "scheduled" | "live" | "ended" | "cancelled";
  recording_url: string | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  project_id: string;
  host_id: string;
  title: string;
  description: string | null;
  required_format: "text" | "audio" | "video" | "image";
  due_at: string | null;
  created_at: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  user_id: string;
  format: "text" | "audio" | "video" | "image";
  content: string | null;
  media_url: string | null;
  submitted_at: string;
}

// Membership is granted only by the purchase edge function (no
// client INSERT policy on room_members) — this just checks whether
// the current user is already in.
export function useIsRoomMember(projectId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-room-member", projectId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("room_members")
        .select("user_id")
        .eq("project_id", projectId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!projectId && !!user,
  });
}

export function useRoomMemberCount(projectId: string | undefined) {
  return useQuery({
    queryKey: ["room-member-count", projectId],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("room_members")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!projectId,
  });
}

export function useRoomPosts(projectId: string | undefined) {
  return useQuery({
    queryKey: ["room-posts", projectId],
    queryFn: async (): Promise<RoomPost[]> => {
      const { data, error } = await supabase
        .from("room_posts")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
    // Members/host only per RLS — a non-member's query just comes
    // back empty rather than erroring, which is fine for this view.
  });
}

export function usePostToRoom(projectId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    meta: { blocking: true },
    mutationFn: async (input: { type: RoomPost["type"]; content?: string; media_url?: string }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("room_posts").insert({
        project_id: projectId,
        sender_id: user.id,
        type: input.type,
        content: input.content ?? null,
        media_url: input.media_url ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["room-posts", projectId] }),
  });
}

export function useRoomMeetings(projectId: string | undefined) {
  return useQuery({
    queryKey: ["room-meetings", projectId],
    queryFn: async (): Promise<RoomMeeting[]> => {
      const { data, error } = await supabase
        .from("room_meetings")
        .select("*")
        .eq("project_id", projectId)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });
}

// Host-only per RLS (room_meetings write policy checks projects.owner_id).
export function useScheduleRoomMeeting(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { blocking: true },
    mutationFn: async (input: { title?: string; scheduled_at: string }) => {
      const { error } = await supabase.from("room_meetings").insert({
        project_id: projectId,
        title: input.title || null,
        scheduled_at: input.scheduled_at,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["room-meetings", projectId] }),
  });
}

export function useAssignments(projectId: string | undefined) {
  return useQuery({
    queryKey: ["assignments", projectId],
    queryFn: async (): Promise<Assignment[]> => {
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });
}

// Host-only per RLS.
export function useCreateAssignment(projectId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    meta: { blocking: true },
    mutationFn: async (input: {
      title: string;
      description?: string;
      required_format: Assignment["required_format"];
      due_at?: string;
    }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("assignments").insert({
        project_id: projectId,
        host_id: user.id,
        title: input.title,
        description: input.description ?? null,
        required_format: input.required_format,
        due_at: input.due_at ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments", projectId] }),
  });
}

export function useMySubmission(assignmentId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-submission", assignmentId, user?.id],
    queryFn: async (): Promise<AssignmentSubmission | null> => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSubmitAssignment(assignmentId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    meta: { blocking: true },
    mutationFn: async (input: { format: AssignmentSubmission["format"]; content?: string; media_url?: string }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("assignment_submissions").insert({
        assignment_id: assignmentId,
        user_id: user.id,
        format: input.format,
        content: input.content ?? null,
        media_url: input.media_url ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-submission", assignmentId] }),
  });
}
