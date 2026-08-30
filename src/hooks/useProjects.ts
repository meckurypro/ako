import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  external_url: string | null;
  file_path: string | null;
  thumbnail_url: string | null;
  price_usd: number;
  is_active: boolean;
  created_at: string;
}

export function useUserProjects(userId: string) {
  return useQuery({
    queryKey: ["user-projects", userId],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
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
  price_usd: number;
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

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from("projects").update({ is_active: false }).eq("id", projectId);
      if (error) throw error;
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
