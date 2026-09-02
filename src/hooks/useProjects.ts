// src/hooks/useProjects.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { PROFILE_ROLES_SELECT, toProfileRoles } from "../lib/profileRoles";
import type { AuthorSummary } from "../types/database";

// ------------------------------------------------------------
// Types — mirror the projects table after 19_projects_enhancements.sql
// ------------------------------------------------------------

export type ProjectStatus = "active" | "draft" | "archived";

export type ProjectType =
  | "book"
  | "article"
  | "event"
  | "audio"
  | "video"
  | "course"
  | "cohort"
  | "class"
  | "template"
  | "other";

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  book: "Book",
  article: "Article",
  event: "Event",
  audio: "Audio",
  video: "Video",
  course: "Course",
  cohort: "Cohort",
  class: "Class",
  template: "Template",
  other: "Other",
};

// Order to show in dropdowns/radios — named types first (per the
// original ask), "Other" always last as the catch-all.
export const PROJECT_TYPE_OPTIONS: ProjectType[] = [
  "book",
  "article",
  "event",
  "audio",
  "video",
  "course",
  "cohort",
  "class",
  "template",
  "other",
];

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
  created_at: string;
  updated_at: string;
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
export function useUserProjects(userId: string, includeAllStatuses: boolean) {
  return useQuery({
    queryKey: ["user-projects", userId, includeAllStatuses],
    queryFn: async (): Promise<Project[]> => {
      let query = supabase.from("projects").select("*").eq("owner_id", userId);

      if (!includeAllStatuses) {
        query = query.eq("status", "active");
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
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
  topic_ids?: string[];
}

export function useCreateProject() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ topic_ids, ...input }: CreateProjectInput) => {
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
 */
export function useGetProjectFile() {
  return useMutation({
    mutationFn: async (projectId: string): Promise<string> => {
      const { data, error } = await supabase.functions.invoke("get-project-file", {
        body: { project_id: projectId },
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

      const [creatorRes, typeRes, topicLinkRes] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .eq("owner_id", project!.owner_id)
          .eq("status", "active")
          .neq("id", project!.id)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("projects")
          .select("*")
          .eq("project_type", project!.project_type)
          .eq("status", "active")
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
