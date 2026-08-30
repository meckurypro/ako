import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

/**
 * Checks admin status by querying admin_roles directly. This works
 * cleanly with RLS as written (see 00_foundation.sql): if the caller
 * IS an admin, the "Admins can view admin roles" policy lets the
 * query through and returns their row. If they're NOT an admin, RLS
 * blocks the query entirely (no rows, regardless of the filter) —
 * so a non-admin always gets null here, an admin always gets their row.
 */
export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("admin_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });
}

// ------------------------------------------------------------
// Generic-ish CRUD helpers for the admin-managed lookup tables.
// Each table has slightly different shape, so these are typed
// per-resource rather than fully generic — keeps call sites simple.
// ------------------------------------------------------------

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export function useAdminCategories() {
  return useQuery({
    queryKey: ["admin-categories"],
    queryFn: async (): Promise<AdminCategory[]> => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; slug: string; sort_order: number }) => {
      const { error } = await supabase.from("categories").insert(input);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
  });
}

export function useToggleCategoryActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("categories").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-interests"] });
    },
  });
}

export interface AdminInterest {
  id: string;
  category_id: string | null;
  name: string;
  is_active: boolean;
}

export function useAdminInterests(categoryId: string) {
  return useQuery({
    queryKey: ["admin-interests", categoryId],
    queryFn: async (): Promise<AdminInterest[]> => {
      const { data, error } = await supabase
        .from("interests")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });
}

export function useCreateInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { category_id: string; name: string }) => {
      const { error } = await supabase.from("interests").insert(input);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-interests", variables.category_id] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-interests"] });
    },
  });
}

export function useToggleInterestActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("interests").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-interests"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-interests"] });
    },
  });
}

export interface AdminGiftType {
  id: string;
  name: string;
  cost_usd: number;
  is_active: boolean;
  sort_order: number;
}

export function useAdminGiftTypes() {
  return useQuery({
    queryKey: ["admin-gift-types"],
    queryFn: async (): Promise<AdminGiftType[]> => {
      const { data, error } = await supabase.from("gift_types").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateGiftType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; cost_usd: number; sort_order: number }) => {
      const { error } = await supabase.from("gift_types").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-gift-types"] });
      queryClient.invalidateQueries({ queryKey: ["gift-types"] });
    },
  });
}

export function useToggleGiftTypeActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("gift_types").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-gift-types"] });
      queryClient.invalidateQueries({ queryKey: ["gift-types"] });
    },
  });
}

export interface AdminReportReason {
  id: string;
  label: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export function useAdminReportReasons() {
  return useQuery({
    queryKey: ["admin-report-reasons"],
    queryFn: async (): Promise<AdminReportReason[]> => {
      const { data, error } = await supabase.from("report_reasons").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateReportReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { label: string; description?: string; sort_order: number }) => {
      const { error } = await supabase.from("report_reasons").insert(input);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-report-reasons"] }),
  });
}

export function useToggleReportReasonActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("report_reasons").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-report-reasons"] }),
  });
}

// ------------------------------------------------------------
// Moderation queue — pending user reports
// ------------------------------------------------------------
export interface AdminReport {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason_id: string;
  details: string | null;
  status: "pending" | "reviewing" | "actioned" | "dismissed";
  created_at: string;
  reason: { label: string };
  reporter: { username: string; display_name: string };
}

export function usePendingReports() {
  return useQuery({
    queryKey: ["pending-reports"],
    queryFn: async (): Promise<AdminReport[]> => {
      const { data, error } = await supabase
        .from("reports")
        .select(
          `*, reason:report_reasons!reports_reason_id_fkey(label), reporter:profiles!reports_reporter_id_fkey(username, display_name)`
        )
        .in("status", ["pending", "reviewing"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as AdminReport[];
    },
  });
}

interface ResolveReportInput {
  reportId: string;
  targetType: "post" | "comment" | "profile";
  targetId: string;
  action: "none" | "content_removed" | "content_restricted" | "account_warned" | "account_restricted" | "account_suspended" | "account_banned";
  reason: string;
}

/**
 * Resolves a report: records a moderation_action and updates the
 * report's status. If the action is content_removed, also soft-deletes
 * the underlying post/comment — admins can do this via the RLS
 * carve-out added in 15_admin_moderation_bypass.sql (author-only
 * policies otherwise block this for anyone but the content's owner).
 */
export function useResolveReport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ResolveReportInput) => {
      const { error: actionError } = await supabase.from("moderation_actions").insert({
        target_type: input.targetType,
        target_id: input.targetId,
        action: input.action,
        reason: input.reason,
        related_report_id: input.reportId,
        moderator_id: user!.id,
        is_automated: false,
      });
      if (actionError) throw actionError;

      if (input.action === "content_removed") {
        const table = input.targetType === "comment" ? "comments" : "posts";
        const { error: removeError } = await supabase
          .from(table)
          .update({ is_deleted: true })
          .eq("id", input.targetId);
        if (removeError) throw removeError;
      }

      const { error: reportError } = await supabase
        .from("reports")
        .update({ status: "actioned", reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
        .eq("id", input.reportId);
      if (reportError) throw reportError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-reports"] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

export function useDismissReport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("reports")
        .update({ status: "dismissed", reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pending-reports"] }),
  });
}
