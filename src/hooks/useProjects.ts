// src/hooks/useProjects.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { PROFILE_ROLES_SELECT, toProfileRoles } from "../lib/profileRoles";
import type { AuthorSummary } from "../types/database";

// ------------------------------------------------------------
// Types — mirror the projects table after ako_projects_v3_media_url_privacy.sql
// ------------------------------------------------------------

// 'cancelled' only applies to event/meeting — set when a host cancels
// an upcoming one that already has paid attendees (see cancelled_at
// below). Other types go active <-> draft/archived only.
export type ProjectStatus = "active" | "draft" | "archived" | "cancelled";

// 'audio' and 'video' were merged into a single 'media' type (a media
// project can carry an audio channel, a video channel, or both — see
// MediaDetails in useProjectTypeDetails.ts). 'url' is new: a bare
// link the host is selling access to (a WhatsApp group invite, a
// gated page, anything).
export type ProjectType =
  | "event"
  | "media"
  | "file"
  | "url"
  | "course"
  | "room"
  | "meeting";

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  event: "Event",
  media: "Media",
  file: "File",
  url: "URL",
  course: "Course",
  room: "Room",
  meeting: "Meeting",
};

// Order to show in the type picker.
export const PROJECT_TYPE_OPTIONS: ProjectType[] = [
  "event",
  "meeting",
  "room",
  "course",
  "media",
  "file",
  "url",
];

// Short helper text shown under the type picker once a type is chosen —
// keeps the picker itself uncluttered while still orienting the host.
export const PROJECT_TYPE_HINTS: Record<ProjectType, string> = {
  event: "Sell tickets to something happening in person or online.",
  meeting: "A single scheduled live session people buy access to join.",
  room: "An ongoing paid group — announcements, live meetings, assignments.",
  course: "Structured modules and lessons. Build it, then publish when ready.",
  media: "Audio, video, or both. Link out (Spotify, YouTube) or upload to stream here.",
  file: "A file you upload and host here — visitors download it with one click.",
  url: "A link you're selling access to — a WhatsApp group, a page, anything.",
};

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  external_url: string | null;
  file_path: string | null;
  thumbnail_url: string | null;
  thumbnail_width: number | null;
  thumbnail_height: number | null;
  project_type: ProjectType;
  price_usd: number;
  promo_price_usd: number | null;
  status: ProjectStatus;
  is_active: boolean;
  // null while draft. A 'course' project can't be purchased until
  // this is set — enforced in the purchase edge function, not just
  // here — this field is what CreateProject/CourseBuilder show as
  // "Published" vs "Draft — not visible to buyers yet".
  published_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  // Set by the host, before or after publishing. Doesn't gate direct
  // access (a private project is still reachable by anyone with its
  // URL, same as before) — it only controls whether the project is
  // surfaced anywhere the host didn't hand out directly: their
  // profile's Projects tab (to visitors), and the "similar projects"
  // rails. See useUserProjects/useSimilarProjects below.
  is_private: boolean;
}

// --------------------------------------------------------
// Effective price helpers — "effective" means what the buyer
// actually pays / what determines "free" status. A promo price,
// when set, always wins over the listed price_usd.
//
// NOTE: the purchase-project and get-project-file edge functions,
// and ProjectCard's own display logic, all need to agree on this
// same definition — see the migration file's note on this.
// --------------------------------------------------------

export function getEffectivePrice(project: Pick<Project, "price_usd" | "promo_price_usd">): number {
  return project.promo_price_usd ?? project.price_usd;
}

export function isProjectFree(project: Pick<Project, "price_usd" | "promo_price_usd">): boolean {
  return getEffectivePrice(project) <= 0;
}

export function hasActivePromo(project: Pick<Project, "price_usd" | "promo_price_usd">): boolean {
  return project.promo_price_usd !== null && project.promo_price_usd !== undefined;
}


// --------------------------------------------------------
// Fetch a single project — used by the Edit page to prefill the form.
// --------------------------------------------------------
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async (): Promise<Project> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}


// --------------------------------------------------------
// Fetch a user's projects.
//
// `includeAllStatuses` should be true ONLY when the viewer is the
// owner and NOT previewing their profile as a visitor — that's what
// lets an owner see their own drafts/archived projects to manage
// them. Everyone else (including the owner in "view as visitor"
// preview mode) should only ever see status = 'active'.
//
// IMPORTANT — this filter is enforced client-side here, but the
// real security boundary has to be the table's RLS policy. If the
// existing RLS policy on `projects` filters SELECT to is_active = true
// unconditionally, an owner's own drafts/archived rows won't come
// back from Supabase at all regardless of this query — that policy
// needs updating to allow owner_id = auth.uid() through regardless
// of status, while still restricting everyone else to status =
// 'active'. Flagging this since I haven't seen that policy's SQL.
// --------------------------------------------------------
// includeAllStatuses does double duty as "is this the owner's own
// management view" — the same view that's allowed to see drafts and
// archived projects is the one allowed to see private ones too, so a
// visitor (or the owner previewing their profile as a visitor) never
// sees either. Direct access by id/URL (useProject, useProjectDetail)
// is intentionally NOT filtered by is_private — privacy only affects
// what gets listed, never what a held link can open.
export function useUserProjects(userId: string, includeAllStatuses: boolean) {
  return useQuery({
    queryKey: ["user-projects", userId, includeAllStatuses],
    queryFn: async (): Promise<Project[]> => {
      let query = supabase.from("projects").select("*").eq("owner_id", userId);

      if (!includeAllStatuses) {
        query = query.eq("status", "active").eq("is_private", false);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}


// Per-type detail payloads — only the block matching project_type
// should be passed; the others stay undefined. Room and Course don't
// take detail input at creation time: a Room has nothing to configure
// beyond the base project fields, and a Course's modules/lessons are
// built afterward in the Course builder (see published_at note above —
// it can't be purchased until the host explicitly publishes it there).
interface EventDetailsInput {
  event_date?: string; // ISO — omit for "date TBA"
  location_type: "physical" | "online";
  location_value: string;
  ticket_template_url?: string;
}

interface MeetingDetailsInput {
  scheduled_at: string; // ISO
}

// A 'media' project's audio/video channels — see MediaDetails in
// useProjectTypeDetails.ts for the full shape/invariants. Channel
// fields are only meaningful when the matching has_* flag is true.
interface MediaDetailsInput {
  has_audio: boolean;
  has_video: boolean;
  audio_source?: "link" | "upload";
  audio_url?: string;
  audio_file_path?: string;
  video_source?: "link" | "upload";
  video_url?: string;
  video_file_path?: string;
}

interface CreateProjectInput {
  title: string;
  description?: string;
  external_url?: string;
  file_path?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  project_type: ProjectType;
  price_usd: number;
  promo_price_usd?: number | null;
  status?: ProjectStatus;   // defaults to 'active' (publish immediately) if omitted
  is_private?: boolean;     // defaults to false (listed/discoverable) if omitted
  topic_ids?: string[];
  event_details?: EventDetailsInput;
  meeting_details?: MeetingDetailsInput;
  media_details?: MediaDetailsInput;
}

export function useCreateProject() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      topic_ids,
      event_details,
      meeting_details,
      media_details,
      ...input
    }: CreateProjectInput) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...input, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;

      if (topic_ids && topic_ids.length > 0) {
        const rows = topic_ids.map((interest_id) => ({ project_id: data.id, interest_id }));
        const { error: topicsError } = await supabase.from("project_topics").insert(rows);
        // The project itself is already created at this point — a
        // topic-write failure shouldn't silently produce an
        // untagged project the owner thinks is tagged, so surface it.
        if (topicsError) throw topicsError;
      }

      // Type-specific detail row. Same reasoning as topics above: the
      // project row already exists, so a failure here needs to surface
      // rather than leave a silently incomplete Event/Meeting/Media.
      if (input.project_type === "event" && event_details) {
        const { error: detailsError } = await supabase
          .from("project_event_details")
          .insert({ project_id: data.id, ...event_details });
        if (detailsError) throw detailsError;
      }
      if (input.project_type === "meeting" && meeting_details) {
        const { error: detailsError } = await supabase
          .from("project_meeting_details")
          .insert({ project_id: data.id, ...meeting_details });
        if (detailsError) throw detailsError;
      }
      if (input.project_type === "media" && media_details) {
        const { error: detailsError } = await supabase
          .from("project_media_details")
          .insert({ project_id: data.id, ...media_details });
        if (detailsError) throw detailsError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-projects"] });
    },
  });
}


interface UpdateProjectInput {
  id: string;
  title?: string;
  description?: string | null;
  external_url?: string | null;
  file_path?: string | null;
  thumbnail_url?: string | null;
  thumbnail_width?: number | null;
  thumbnail_height?: number | null;
  project_type?: ProjectType;
  price_usd?: number;
  promo_price_usd?: number | null;
  status?: ProjectStatus;
  is_private?: boolean;
  // undefined = leave topics untouched (e.g. a status-only change).
  // An array — including [] — replaces the full topic set.
  topic_ids?: string[];
}

// Full edit — content fields, price, and optionally status all in
// one save from the Edit page.
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, topic_ids, ...patch }: UpdateProjectInput) => {
      const { data, error } = await supabase
        .from("projects")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      if (topic_ids !== undefined) {
        const { error: deleteError } = await supabase
          .from("project_topics")
          .delete()
          .eq("project_id", id);
        if (deleteError) throw deleteError;

        if (topic_ids.length > 0) {
          const rows = topic_ids.map((interest_id) => ({ project_id: id, interest_id }));
          const { error: insertError } = await supabase.from("project_topics").insert(rows);
          if (insertError) throw insertError;
        }
      }

      return data as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user-projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", data.id] });
      queryClient.invalidateQueries({ queryKey: ["project-topics", data.id] });
      queryClient.invalidateQueries({ queryKey: ["project-detail", data.id] });
      queryClient.invalidateQueries({ queryKey: ["similar-projects"] });
    },
  });
}


// Quick status-only transition — used by the kebab menu on
// ProjectCard for one-tap Publish / Unpublish / Archive / Restore,
// without opening the full edit form. The sync_project_status
// trigger (from the migration) keeps is_active in lockstep with
// whatever status is written here.
export function useSetProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProjectStatus }) => {
      const { error } = await supabase.from("projects").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}


/**
 * Hard-deletes a project via the delete-project edge function.
 * Goes through an edge function rather than direct RLS because it
 * needs to distinguish "no purchases, delete succeeded" from "this
 * project has purchase history and can't be removed" and return a
 * clear message for the latter rather than a raw FK error.
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-project", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-projects"] });
    },
  });
}

export function useHasPurchased(projectId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["has-purchased", projectId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("purchases")
        .select("id")
        .eq("project_id", projectId)
        .eq("buyer_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });
}

export function usePurchaseProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data, error } = await supabase.functions.invoke("purchase-project", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.purchase;
    },
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: ["has-purchased", projectId] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

/**
 * Fetches a short-lived signed URL for a project's hosted file.
 * The edge function itself is the access gate (owner/free/purchased) —
 * this hook just calls it and surfaces the result or the rejection.
 *
 * `kind` tells the edge function which stored path to sign:
 *  - "file"  → projects.file_path            (File-type projects)
 *  - "audio" → project_media_details.audio_file_path
 *  - "video" → project_media_details.video_file_path
 * Defaults to "file" for existing call sites. NOTE: the deployed
 * get-project-file function needs to be updated to branch on this —
 * see the note in project-types/MediaFields.tsx / README.
 */
export function useGetProjectFile() {
  return useMutation({
    mutationFn: async ({
      projectId,
      kind = "file",
    }: {
      projectId: string;
      kind?: "file" | "audio" | "video";
    }): Promise<string> => {
      const { data, error } = await supabase.functions.invoke("get-project-file", {
        body: { project_id: projectId, kind },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.url;
    },
  });
}

// --------------------------------------------------------
// Topic tags (project_topics) — mirrors post_topics. Fetched
// separately from the project row itself so the Edit form can
// prefill its topic picker independently of the rest of hydration.
// --------------------------------------------------------
export function useProjectTopics(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-topics", projectId],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("project_topics")
        .select("interest_id")
        .eq("project_id", projectId);
      if (error) throw error;
      return data.map((row) => row.interest_id);
    },
    enabled: !!projectId,
  });
}

// --------------------------------------------------------
// Project detail page — the project itself plus its creator's byline
// (avatar, name, tier, job/hobby tags) and its topic tags, so a
// visitor landing on a shared project link can tap through to the
// creator's profile and see what it's tagged under.
// --------------------------------------------------------
export type ProjectWithOwner = Project & {
  owner: AuthorSummary;
  topics: { id: string; name: string }[];
};

const PROJECT_WITH_OWNER_SELECT = `*, owner:profiles!projects_owner_id_fkey(id, username, display_name, avatar_url, tier, ${PROFILE_ROLES_SELECT}), topics:project_topics(interest:interests(id, name))`;

export function useProjectDetail(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-detail", projectId],
    queryFn: async (): Promise<ProjectWithOwner> => {
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_WITH_OWNER_SELECT)
        .eq("id", projectId)
        .single();
      if (error) throw error;

      const raw = data as any;
      const { profile_roles, ...owner } = raw.owner;
      return {
        ...raw,
        owner: { ...owner, roles: toProfileRoles(profile_roles) },
        topics: (raw.topics ?? []).map((t: any) => t.interest),
      };
    },
    enabled: !!projectId,
  });
}

/**
 * "Similar projects" for the detail page, ranked by three signals:
 * same creator, same project_type, and shared topics (project_topics).
 * Returned as three separate rails rather than one merged/scored
 * list — a real relevance score across signals needs an RPC to be
 * meaningful; naively interleaving three client-side arrays would
 * just be theater. Some overlap between rails is expected and fine
 * (a project can legitimately be both "from this creator" and "on
 * this topic") — same tradeoff most feeds make.
 */
export function useSimilarProjects(
  project:
    | (Pick<Project, "id" | "owner_id" | "project_type"> & { topics?: { id: string }[] })
    | undefined
) {
  return useQuery({
    queryKey: ["similar-projects", project?.id],
    queryFn: async (): Promise<{
      moreFromCreator: Project[];
      moreOfType: Project[];
      moreOnTopic: Project[];
    }> => {
      const topicIds = (project!.topics ?? []).map((t) => t.id);

      // is_private = false on every branch here — these rails are
      // discovery surfaces, exactly what a private project must stay
      // out of (see the is_private note on the Project type above).
      const [creatorRes, typeRes, topicLinkRes] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .eq("owner_id", project!.owner_id)
          .eq("status", "active")
          .eq("is_private", false)
          .neq("id", project!.id)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("projects")
          .select("*")
          .eq("project_type", project!.project_type)
          .eq("status", "active")
          .eq("is_private", false)
          .neq("id", project!.id)
          .neq("owner_id", project!.owner_id) // avoid duplicating the "more from creator" list
          .order("created_at", { ascending: false })
          .limit(6),
        topicIds.length > 0
          ? supabase
              .from("project_topics")
              .select("project_id")
              .in("interest_id", topicIds)
              .neq("project_id", project!.id)
          : Promise.resolve({ data: [] as { project_id: string }[], error: null }),
      ]);
      if (creatorRes.error) throw creatorRes.error;
      if (typeRes.error) throw typeRes.error;
      if (topicLinkRes.error) throw topicLinkRes.error;

      let moreOnTopic: Project[] = [];
      const topicProjectIds = Array.from(
        new Set((topicLinkRes.data ?? []).map((row) => row.project_id))
      );
      if (topicProjectIds.length > 0) {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .in("id", topicProjectIds)
          .eq("status", "active")
          .eq("is_private", false)
          .order("created_at", { ascending: false })
          .limit(6);
        if (error) throw error;
        moreOnTopic = data;
      }

      return { moreFromCreator: creatorRes.data, moreOfType: typeRes.data, moreOnTopic };
    },
    enabled: !!project,
  });
}
