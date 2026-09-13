import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import type { ProjectType } from "./useProjects";

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
  icon_url: string | null;
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
    mutationFn: async (input: { name: string; cost_usd: number; icon_url?: string; sort_order: number }) => {
      const { error } = await supabase.from("gift_types").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-gift-types"] });
      queryClient.invalidateQueries({ queryKey: ["gift-types"] });
    },
  });
}

export function useUpdateGiftType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      cost_usd,
      icon_url,
    }: {
      id: string;
      name: string;
      cost_usd: number;
      icon_url: string | null;
    }) => {
      const { error } = await supabase
        .from("gift_types")
        .update({ name, cost_usd, icon_url: icon_url || null })
        .eq("id", id);
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

// ------------------------------------------------------------
// Project types — per-type on/off switch, matching ako_admin_
// project_type_controls_migration.sql. Public-read table, so the
// picker in CreateProject can filter to enabled types too (see
// useProjectTypeSettings in useProjects.ts) — these admin hooks just
// add the write side.
// ------------------------------------------------------------
export interface ProjectTypeSetting {
  project_type: ProjectType;
  is_active: boolean;
  hide_when_ineligible: boolean;
  updated_at: string;
}

export function useAdminProjectTypeSettings() {
  return useQuery({
    queryKey: ["admin-project-type-settings"],
    queryFn: async (): Promise<ProjectTypeSetting[]> => {
      const { data, error } = await supabase
        .from("project_type_settings")
        .select("*")
        .order("project_type");
      if (error) throw error;
      return data;
    },
  });
}

export function useToggleProjectTypeActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ project_type, is_active }: { project_type: ProjectType; is_active: boolean }) => {
      const { error } = await supabase
        .from("project_type_settings")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("project_type", project_type);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-project-type-settings"] });
      queryClient.invalidateQueries({ queryKey: ["project-type-settings"] });
    },
  });
}

// Whether a type stays visible-but-locked or disappears entirely for
// users who don't meet its access rule — see project_type_settings'
// hide_when_ineligible column.
export function useToggleHideWhenIneligible() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      project_type,
      hide_when_ineligible,
    }: {
      project_type: ProjectType;
      hide_when_ineligible: boolean;
    }) => {
      const { error } = await supabase
        .from("project_type_settings")
        .update({ hide_when_ineligible, updated_at: new Date().toISOString() })
        .eq("project_type", project_type);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-project-type-settings"] });
      queryClient.invalidateQueries({ queryKey: ["project-type-settings"] });
    },
  });
}

// ------------------------------------------------------------
// Achievement-based access rules per project type — followers,
// account age, total engagement. All three default to 0 (no
// restriction) until an admin sets them.
// ------------------------------------------------------------
export interface ProjectTypeAccessRule {
  project_type: ProjectType;
  min_follower_count: number;
  min_account_age_days: number;
  min_total_engagement: number;
  updated_at: string;
}

export function useAdminAccessRules() {
  return useQuery({
    queryKey: ["admin-access-rules"],
    queryFn: async (): Promise<ProjectTypeAccessRule[]> => {
      const { data, error } = await supabase
        .from("project_type_access_rules")
        .select("*")
        .order("project_type");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateAccessRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      project_type: ProjectType;
      min_follower_count: number;
      min_account_age_days: number;
      min_total_engagement: number;
    }) => {
      const { project_type, ...rest } = input;
      const { error } = await supabase
        .from("project_type_access_rules")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("project_type", project_type);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-access-rules"] });
      queryClient.invalidateQueries({ queryKey: ["project-type-access-rules"] });
    },
  });
}

// ------------------------------------------------------------
// Site-wide kill switch for standing up new Pages (organisation,
// brand, or product). Same moderation_settings key/value table as AI
// moderation above — this only ever gates the "create a page" entry
// points and the /pages/new route itself; pages that already exist,
// and everything about acting as one, are untouched by this.
// ------------------------------------------------------------
const PAGES_ENABLED_KEY = "pages_creation_enabled";

export function usePagesFeatureSettings() {
  return useQuery({
    queryKey: ["admin-pages-feature-settings"],
    queryFn: async (): Promise<{ pages_creation_enabled: boolean }> => {
      const { data, error } = await supabase
        .from("moderation_settings")
        .select("value")
        .eq("key", PAGES_ENABLED_KEY)
        .maybeSingle();
      if (error) throw error;
      // No row yet defaults to on — Pages has been a live feature, this
      // toggle is an off switch, not an opt-in.
      return { pages_creation_enabled: data ? data.value === "true" : true };
    },
  });
}

export function useTogglePagesEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pages_creation_enabled: boolean) => {
      const { error } = await supabase
        .from("moderation_settings")
        .upsert({ key: PAGES_ENABLED_KEY, value: pages_creation_enabled ? "true" : "false" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-pages-feature-settings"] }),
  });
}

// ------------------------------------------------------------
// Page creation eligibility rule — 30 posts + 30 distinct engaged
// posts in the trailing 30 days by default (see
// capability_creation_rules / get_page_creation_eligibility() in the
// migration, and create_page() which independently re-checks this
// server-side — this is the write side for the one config row
// keyed capability = 'create_page').
// ------------------------------------------------------------
export interface PageCreationRule {
  capability: "create_page";
  min_posts_30d: number;
  min_distinct_engaged_posts_30d: number;
  min_account_age_days: number;
  is_active: boolean;
  updated_at: string;
}

export function useAdminPageCreationRule() {
  return useQuery({
    queryKey: ["admin-page-creation-rule"],
    queryFn: async (): Promise<PageCreationRule | null> => {
      const { data, error } = await supabase
        .from("capability_creation_rules")
        .select("*")
        .eq("capability", "create_page")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdatePageCreationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      min_posts_30d: number;
      min_distinct_engaged_posts_30d: number;
      min_account_age_days: number;
      is_active: boolean;
    }) => {
      const { error } = await supabase
        .from("capability_creation_rules")
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq("capability", "create_page");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-page-creation-rule"] });
      // The signed-in user's own progress display should reflect an
      // admin's threshold change immediately, not just other admins'.
      queryClient.invalidateQueries({ queryKey: ["page-creation-eligibility"] });
    },
  });
}

// Deliberately a SEPARATE table from project_type_rule_exemptions
// (see capability_overrides in the migration): that table is a
// blanket per-user pass on every project-type rule at once, keyed
// only by user_id. An override here is scoped to the single
// 'create_page' capability, so testing/granting Page access can
// never accidentally also unlock every project type for that account.
export interface AdminPageCapabilitySearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  follower_count: number;
  created_at: string;
  has_page_override: boolean;
}

export function useAdminSearchAccountsForPageCapability(query: string) {
  return useQuery({
    queryKey: ["admin-search-accounts-page-capability", query],
    queryFn: async (): Promise<AdminPageCapabilitySearchResult[]> => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, follower_count, created_at")
        .eq("is_deleted", false)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .order("follower_count", { ascending: false })
        .limit(20);
      if (error) throw error;
      if (!profiles || profiles.length === 0) return [];

      const { data: overrides, error: overridesError } = await supabase
        .from("capability_overrides")
        .select("user_id, revoked_at, expires_at")
        .eq("capability", "create_page")
        .in(
          "user_id",
          profiles.map((p) => p.id)
        );
      if (overridesError) throw overridesError;

      const now = Date.now();
      const activeOverrideIds = new Set(
        (overrides ?? [])
          .filter((o) => !o.revoked_at && (!o.expires_at || new Date(o.expires_at).getTime() > now))
          .map((o) => o.user_id)
      );

      return profiles.map((p) => ({ ...p, has_page_override: activeOverrideIds.has(p.id) }));
    },
    enabled: query.trim().length > 1,
  });
}

export function useGrantPageCreationOverride() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      // Upsert so re-granting after a revoke clears revoked_at/expires_at
      // rather than colliding with the (user_id, capability) primary key.
      const { error } = await supabase.from("capability_overrides").upsert({
        user_id: targetUserId,
        capability: "create_page",
        granted_by: user?.id,
        reason: "Admin test override",
        revoked_at: null,
        revoked_by: null,
        expires_at: null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-search-accounts-page-capability"] }),
  });
}

export function useRevokePageCreationOverride() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase
        .from("capability_overrides")
        .update({ revoked_at: new Date().toISOString(), revoked_by: user?.id })
        .eq("user_id", targetUserId)
        .eq("capability", "create_page");
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-search-accounts-page-capability"] }),
  });
}

// ------------------------------------------------------------
// Account exemptions — admin grants a specific user a full pass on
// project_type_access_rules (see project_type_rule_exemptions in
// ako_admin_project_type_controls_migration.sql). Search is a plain
// ilike on username/display_name — no social-graph scoring like
// useSearchPeople, since an admin's own follow relationships to the
// searched account aren't relevant here.
// ------------------------------------------------------------
export interface AdminAccountSearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  follower_count: number;
  created_at: string;
  is_exempt: boolean;
}

export function useAdminSearchAccounts(query: string) {
  return useQuery({
    queryKey: ["admin-search-accounts", query],
    queryFn: async (): Promise<AdminAccountSearchResult[]> => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, follower_count, created_at")
        .eq("is_deleted", false)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .order("follower_count", { ascending: false })
        .limit(20);
      if (error) throw error;
      if (!profiles || profiles.length === 0) return [];

      const { data: exemptions, error: exemptionsError } = await supabase
        .from("project_type_rule_exemptions")
        .select("user_id")
        .in(
          "user_id",
          profiles.map((p) => p.id)
        );
      if (exemptionsError) throw exemptionsError;
      const exemptIds = new Set((exemptions ?? []).map((e) => e.user_id));

      return profiles.map((p) => ({ ...p, is_exempt: exemptIds.has(p.id) }));
    },
    enabled: query.trim().length > 1,
  });
}

export function useGrantProjectTypeExemption() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase
        .from("project_type_rule_exemptions")
        .insert({ user_id: targetUserId, granted_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-search-accounts"] }),
  });
}

export function useRevokeProjectTypeExemption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase
        .from("project_type_rule_exemptions")
        .delete()
        .eq("user_id", targetUserId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-search-accounts"] }),
  });
}

// ------------------------------------------------------------
// Suggested profiles — admin-curated pool that feeds into
// get_onboarding_recommendations (see
// sql/31_onboarding_recommendations.sql) as one ranking signal
// alongside interest overlap, per NewUserOnboarding.md §10/§11.
// Search reuses the same username/display_name ilike as
// useAdminSearchAccounts above.
// ------------------------------------------------------------
export interface AdminSuggestibleAccount {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  follower_count: number;
  is_suggested: boolean;
}

export function useAdminSearchSuggestibleAccounts(query: string) {
  return useQuery({
    queryKey: ["admin-search-suggestible-accounts", query],
    queryFn: async (): Promise<AdminSuggestibleAccount[]> => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, follower_count")
        .eq("is_deleted", false)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .order("follower_count", { ascending: false })
        .limit(20);
      if (error) throw error;
      if (!profiles || profiles.length === 0) return [];

      const { data: suggested, error: suggestedError } = await supabase
        .from("suggested_profiles")
        .select("profile_id")
        .in(
          "profile_id",
          profiles.map((p) => p.id)
        );
      if (suggestedError) throw suggestedError;
      const suggestedIds = new Set((suggested ?? []).map((s) => s.profile_id));

      return profiles.map((p) => ({ ...p, is_suggested: suggestedIds.has(p.id) }));
    },
    enabled: query.trim().length > 1,
  });
}

export interface AdminSuggestedProfile {
  id: string;
  profile_id: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  profile: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export function useAdminSuggestedProfilesList() {
  return useQuery({
    queryKey: ["admin-suggested-profiles"],
    queryFn: async (): Promise<AdminSuggestedProfile[]> => {
      const { data, error } = await supabase
        .from("suggested_profiles")
        .select(
          `id, profile_id, is_active, priority, created_at, profile:profiles!suggested_profiles_profile_id_fkey(username, display_name, avatar_url)`
        )
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AdminSuggestedProfile[];
    },
  });
}

export function useAddSuggestedProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase
        .from("suggested_profiles")
        .insert({ profile_id: profileId, added_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-search-suggestible-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-suggested-profiles"] });
    },
  });
}

export function useRemoveSuggestedProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase.from("suggested_profiles").delete().eq("profile_id", profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-search-suggestible-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-suggested-profiles"] });
    },
  });
}

export function useSetSuggestedProfileActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, isActive }: { profileId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("suggested_profiles")
        .update({ is_active: isActive })
        .eq("profile_id", profileId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-suggested-profiles"] }),
  });
}

export function useSetSuggestedProfilePriority() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, priority }: { profileId: string; priority: number }) => {
      const { error } = await supabase
        .from("suggested_profiles")
        .update({ priority })
        .eq("profile_id", profileId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-suggested-profiles"] }),
  });
}
