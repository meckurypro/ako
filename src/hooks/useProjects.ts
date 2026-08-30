import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

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
  | "template"
  | "other";

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  book: "Book",
  article: "Article",
  event: "Event",
  audio: "Audio",
  video: "Video",
  course: "Course",
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
}

export function useCreateProject() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...input, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;
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
}

// Full edit — content fields, price, and optionally status all in
// one save from the Edit page.
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateProjectInput) => {
      const { data, error } = await supabase
        .from("projects")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user-projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", data.id] });
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
