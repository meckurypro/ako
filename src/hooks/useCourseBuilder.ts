// src/hooks/useCourseBuilder.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  media_url: string | null;
  sort_order: number;
}

export interface CourseModule {
  id: string;
  project_id: string;
  title: string;
  sort_order: number;
  lessons: CourseLesson[];
}

// One query, assembled client-side into modules-with-lessons — this
// is a builder screen, not an infinite feed, so there's no pagination
// concern that would push us toward two separate queries.
export function useCourseModules(projectId: string | undefined) {
  return useQuery({
    queryKey: ["course-modules", projectId],
    queryFn: async (): Promise<CourseModule[]> => {
      const { data: modules, error: modulesError } = await supabase
        .from("course_modules")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (modulesError) throw modulesError;

      const { data: lessons, error: lessonsError } = await supabase
        .from("course_lessons")
        .select("*")
        .in("module_id", (modules ?? []).map((m) => m.id))
        .order("sort_order", { ascending: true });
      if (lessonsError) throw lessonsError;

      return (modules ?? []).map((m) => ({
        ...m,
        lessons: (lessons ?? []).filter((l) => l.module_id === m.id),
      }));
    },
    enabled: !!projectId,
  });
}

export function useAddModule(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, sortOrder }: { title: string; sortOrder: number }) => {
      const { error } = await supabase
        .from("course_modules")
        .insert({ project_id: projectId, title, sort_order: sortOrder });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["course-modules", projectId] }),
  });
}

export function useAddLesson(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { moduleId: string; title: string; content?: string; sortOrder: number }) => {
      const { error } = await supabase.from("course_lessons").insert({
        module_id: input.moduleId,
        title: input.title,
        content: input.content ?? null,
        sort_order: input.sortOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["course-modules", projectId] }),
  });
}

export function useDeleteModule(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (moduleId: string) => {
      // Lessons under this module have no ON DELETE CASCADE in the
      // migration, so remove them first or the FK will reject this.
      await supabase.from("course_lessons").delete().eq("module_id", moduleId);
      const { error } = await supabase.from("course_modules").delete().eq("id", moduleId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["course-modules", projectId] }),
  });
}

// Publishing just means setting the project active with published_at
// set — no separate "course_status" to manage. The purchase edge
// function is what actually enforces "can't buy before this is set";
// this hook only flips it.
export function usePublishCourse(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("projects")
        .update({ status: "active", published_at: new Date().toISOString() })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
    },
  });
}
