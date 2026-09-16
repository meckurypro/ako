// src/hooks/usePortfolio.ts
//
// AKỌ_DYNAMIC_PROFILE_PORTFOLIOS_AND_GIG_SYSTEM — Phase 1.
//
// The canonical `professional_role → portfolio_category` taxonomy
// (gig_roles table, admin-curated, same pattern as `roles` and
// `categories`) and the derived dynamic profile tabs it powers.
//
// A role answers "how did this person contribute" (Cinematographer).
// A category answers "what kind of work can visitors explore"
// (Film). See section 3 of the spec doc for the full mapping.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import type { Project } from "./useProjects";

export interface GigRole {
  id: string;
  key: string;
  label: string;
  category: string;
  sort_order: number;
}

/** The full canonical role taxonomy, for the Gig role picker. */
export function useGigRoles() {
  return useQuery({
    queryKey: ["gig-roles"],
    queryFn: async (): Promise<GigRole[]> => {
      const { data, error } = await supabase
        .from("gig_roles")
        .select("id, key, label, category, sort_order")
        .eq("is_active", true)
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return data as GigRole[];
    },
    staleTime: 1000 * 60 * 60, // admin-curated, rarely changes
  });
}

/** Same list, grouped by category — what the role picker actually renders. */
export function useGigRolesByCategory() {
  const query = useGigRoles();
  const grouped = new Map<string, GigRole[]>();
  for (const role of query.data ?? []) {
    const list = grouped.get(role.category) ?? [];
    list.push(role);
    grouped.set(role.category, list);
  }
  return { ...query, grouped };
}

export interface PortfolioCategory {
  category: string;
  gig_count: number;
  project_count: number;
}

/**
 * A profile's dynamic portfolio tabs — one aggregate query (see
 * get_profile_portfolio_categories) rather than one query per
 * candidate category (spec section 37). A category only appears if
 * the account has at least one active Gig in it with at least one
 * published, public portfolio project attached — "meaningful
 * eligible work" per spec section 2. Never returns an empty category.
 */
export function usePortfolioCategories(accountId: string | undefined) {
  return useQuery({
    queryKey: ["portfolio-categories", accountId],
    queryFn: async (): Promise<PortfolioCategory[]> => {
      if (!accountId) return [];
      const { data, error } = await supabase.rpc("get_profile_portfolio_categories", {
        p_account_id: accountId,
      });
      if (error) throw error;
      return (data ?? []) as PortfolioCategory[];
    },
    enabled: !!accountId,
  });
}

/**
 * The actual portfolio items behind one dynamic tab (e.g. everything
 * under "Film") — real Project rows, so they render with the same
 * <ProjectCard> used everywhere else. Joins project_gig_details →
 * project_gig_samples → the sample Projects, scoped to this
 * account's active gigs in this category. Reuses the existing
 * portfolio join table rather than a second one (spec section 9 —
 * never clone a Project into a portfolio), and one canonical Project
 * attached to more than one gig in the same category only shows once.
 */
export function usePortfolioCategoryProjects(accountId: string | undefined, category: string | undefined) {
  return useQuery({
    queryKey: ["portfolio-category-projects", accountId, category],
    queryFn: async (): Promise<Project[]> => {
      if (!accountId || !category) return [];

      const { data: gigRows, error: gigError } = await supabase
        .from("project_gig_details")
        .select("project_id, gig_roles!inner(category), projects!inner(owner_id, status)")
        .eq("gig_roles.category", category)
        .eq("projects.owner_id", accountId)
        .eq("projects.status", "active");
      if (gigError) throw gigError;

      const gigProjectIds = (gigRows ?? []).map((r: any) => r.project_id);
      if (gigProjectIds.length === 0) return [];

      const { data: sampleRows, error: sampleError } = await supabase
        .from("project_gig_samples")
        .select("sample_project_id")
        .in("gig_project_id", gigProjectIds);
      if (sampleError) throw sampleError;

      const sampleIds = [...new Set((sampleRows ?? []).map((r) => r.sample_project_id))];
      if (sampleIds.length === 0) return [];

      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .in("id", sampleIds)
        .eq("status", "active")
        .eq("is_private", false)
        .order("created_at", { ascending: false });
      if (projectsError) throw projectsError;
      return (projects ?? []) as Project[];
    },
    enabled: !!accountId && !!category,
  });
}

export interface MyGig {
  id: string;
  title: string;
  thumbnail_url: string | null;
  status: string;
  created_at: string;
  role_label: string | null;
  category: string | null;
  is_complete: boolean;
  source: "manual" | "auto_project" | "auto_collaboration";
}

/**
 * "Your Gigs" — every project_type='gig' Project the account owns,
 * across every status and completion state, in one query. This is
 * the missing piece flagged by the AKO_GIG_ROLE_EXPANSION audit
 * (spec section 21): an auto-created draft Gig (source =
 * auto_collaboration/auto_project, is_complete = false) never
 * appears in the dynamic profile tabs above — get_profile_portfolio_
 * categories deliberately only surfaces complete, published Gigs —
 * so without this list the one-time notification is the only way an
 * owner could ever find it again. Ordered incomplete-first so
 * anything needing attention surfaces at the top.
 */
export function useMyGigs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-gigs", user?.id],
    queryFn: async (): Promise<MyGig[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, title, thumbnail_url, status, created_at, project_gig_details!inner(is_complete, source, gig_roles(label, category))"
        )
        .eq("owner_id", user.id)
        .eq("project_type", "gig")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((row: any) => {
          const details = Array.isArray(row.project_gig_details) ? row.project_gig_details[0] : row.project_gig_details;
          const role = Array.isArray(details?.gig_roles) ? details.gig_roles[0] : details?.gig_roles;
          return {
            id: row.id,
            title: row.title,
            thumbnail_url: row.thumbnail_url,
            status: row.status,
            created_at: row.created_at,
            role_label: role?.label ?? null,
            category: role?.category ?? null,
            is_complete: details?.is_complete ?? true,
            source: details?.source ?? "manual",
          };
        })
        .sort((a, b) => Number(a.is_complete) - Number(b.is_complete));
    },
    enabled: !!user,
  });
}
