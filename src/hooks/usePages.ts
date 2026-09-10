// src/hooks/usePages.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { syncThemeColorMeta } from "./useTheme";
import { PAGE_AFFILIATION_SELECT, PAGE_WITH_MEMBERSHIP_SELECT, toPageAffiliations } from "../lib/pageRoles";
import type {
  ActiveIdentity,
  Page,
  PageAffiliation,
  PageMemberWithProfile,
  PageSummary,
  PageType,
  PageWithMyMembership,
  PendingPageInvite,
} from "../types/database";

const PAGE_SELECT = "id, page_type, name, username, tagline, bio, avatar_url, cover_url, website_url, category_id, parent_organization_id, created_by, is_verified, is_active, follower_count, created_at, updated_at";

/** Minimal page lookup by id — used where only a page_id is on hand
 * (e.g. resolving a page_role_accepted notification's target to a
 * route), as opposed to usePageByUsername which is what routes use. */
export function usePageById(pageId: string, enabled = true) {
  return useQuery({
    queryKey: ["page-by-id", pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("id, username, name, avatar_url, page_type, is_verified")
        .eq("id", pageId)
        .single();
      if (error) throw error;
      return data as PageSummary;
    },
    enabled: enabled && !!pageId,
  });
}

export function usePageByUsername(username: string) {
  return useQuery({
    queryKey: ["page", username],
    queryFn: async (): Promise<Page> => {
      const { data, error } = await supabase
        .from("pages")
        .select(PAGE_SELECT)
        .eq("username", username)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!username,
  });
}

/**
 * Pages the signed-in user can currently switch into — every page
 * where they have an ACTIVE role. Powers the mode switcher and the
 * "My Pages" hub.
 */
export function useMyPages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-pages", user?.id],
    queryFn: async (): Promise<PageWithMyMembership[]> => {
      const { data, error } = await supabase
        .from("page_members")
        .select(PAGE_WITH_MEMBERSHIP_SELECT)
        .eq("user_id", user!.id)
        .eq("status", "active");
      if (error) throw error;
      return (data as any[])
        .filter((row) => row.page)
        .map((row) => ({ ...row.page, my_role_label: row.role_label, my_is_admin: row.is_admin }));
    },
    enabled: !!user,
  });
}

/** Pending role invites addressed to the signed-in user, newest first. */
export function useMyPendingPageInvites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-page-invites", user?.id],
    queryFn: async (): Promise<PendingPageInvite[]> => {
      const { data, error } = await supabase
        .from("page_members")
        .select(`*, page:pages(id, username, name, avatar_url, page_type, is_verified)`)
        .eq("user_id", user!.id)
        .eq("status", "invited")
        .order("invited_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });
}

/**
 * The identity the signed-in user is currently acting as — personal,
 * or one of their pages plus their role on it. Everything that needs
 * to render "who am I right now" (composer, header, settings) should
 * read from this single hook so they never disagree.
 */
export function useActiveIdentity() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["active-identity", user?.id],
    queryFn: async (): Promise<ActiveIdentity> => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("active_page_id")
        .eq("id", user!.id)
        .single();
      if (error) throw error;

      if (!profile.active_page_id) return { mode: "personal" };

      const { data: membership, error: memberError } = await supabase
        .from("page_members")
        .select(`role_label, is_admin, page:pages(${PAGE_SELECT})`)
        .eq("page_id", profile.active_page_id)
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      if (memberError) throw memberError;

      // Membership vanished from under them (removed, page deactivated) —
      // the DB trigger clears active_page_id on removal, but a stale
      // cache read can still land here between that happening and the
      // next refetch. Fall back to personal rather than error out.
      if (!membership || !membership.page) return { mode: "personal" };

      return {
        mode: "page",
        page: membership.page as any,
        role_label: membership.role_label,
        is_admin: membership.is_admin,
      };
    },
    enabled: !!user,
  });
}

export function useSwitchActiveMode() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    meta: { blocking: true },
    mutationFn: async (pageId: string | null) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.rpc("switch_active_mode", { p_page_id: pageId });
      if (error) throw error;
    },
    // Awaited (not fire-and-forget) so the mutation's own promise — and
    // therefore LoadingOverlay, which is keyed to this mutation via
    // meta.blocking — doesn't settle until the refetch this triggers has
    // actually landed in the cache.
    //
    // The class/meta-color toggle itself is also applied directly here
    // rather than left to usePageThemeSync's effect to pick up on the
    // next render: we already know which mode we're switching TO (it's
    // the pageId argument), so there's no reason to wait on a re-render
    // to rediscover that. usePageThemeSync still exists and still runs —
    // it's the source of truth for cold loads (see the localStorage hint
    // in index.html) and for identity changing from another surface —
    // it'll just confirm the same value here, harmlessly redundant on
    // this path specifically.
    onSuccess: async (_data, pageId) => {
      await queryClient.invalidateQueries({ queryKey: ["active-identity"] });
      document.documentElement.classList.toggle("page-mode", pageId !== null);
      syncThemeColorMeta();
    },
  });
}

interface CreatePageInput {
  page_type: PageType;
  name: string;
  username: string;
  role_label: string;
  bio?: string;
  tagline?: string;
  avatar_url?: string;
  category_id?: string;
  parent_organization_id?: string;
}

export function useCreatePage() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { blocking: true },
    mutationFn: async (input: CreatePageInput): Promise<Page> => {
      const { data, error } = await supabase.rpc("create_page", {
        p_page_type: input.page_type,
        p_name: input.name,
        p_username: input.username,
        p_role_label: input.role_label,
        p_bio: input.bio ?? null,
        p_tagline: input.tagline ?? null,
        p_avatar_url: input.avatar_url ?? null,
        p_category_id: input.category_id ?? null,
        p_parent_organization_id: input.parent_organization_id ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-pages"] });
    },
  });
}

interface UpdatePageInput {
  page_id: string;
  name?: string;
  bio?: string;
  tagline?: string;
  avatar_url?: string;
  cover_url?: string;
  website_url?: string;
  category_id?: string | null;
}

/** Direct table update, admin-enforced by RLS — same pattern as
 * useUpdateProfile (no moderation on bio/name here either). */
export function useUpdatePage() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { blocking: true },
    mutationFn: async ({ page_id, ...input }: UpdatePageInput) => {
      const { error } = await supabase.from("pages").update(input).eq("id", page_id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["page"] });
      queryClient.invalidateQueries({ queryKey: ["my-pages"] });
      queryClient.invalidateQueries({ queryKey: ["active-identity"] });
      queryClient.invalidateQueries({ queryKey: ["page-members", variables.page_id] });
    },
  });
}

/** Active roster (public) plus, for admins, the pending invite list too. */
export function usePageMembers(pageId: string) {
  return useQuery({
    queryKey: ["page-members", pageId],
    queryFn: async (): Promise<PageMemberWithProfile[]> => {
      const { data, error } = await supabase
        .from("page_members")
        .select(`*, profile:profiles!page_members_user_id_fkey(id, username, display_name, avatar_url)`)
        .eq("page_id", pageId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!pageId,
  });
}

interface InviteMemberInput {
  page_id: string;
  user_id: string;
  role_label: string;
  is_admin?: boolean;
}

export function useInvitePageMember() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { blocking: true },
    mutationFn: async (input: InviteMemberInput) => {
      const { data, error } = await supabase.rpc("invite_page_member", {
        p_page_id: input.page_id,
        p_user_id: input.user_id,
        p_role_label: input.role_label,
        p_is_admin: input.is_admin ?? false,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["page-members", variables.page_id] });
    },
  });
}

export function useRespondToPageInvite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    meta: { blocking: true },
    mutationFn: async ({ page_id, accept }: { page_id: string; accept: boolean }) => {
      const { error } = await supabase.rpc("respond_to_page_invite", { p_page_id: page_id, p_accept: accept });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["my-page-invites", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["my-pages", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["page-members", variables.page_id] });
    },
  });
}

/** Covers both "admin removes someone" and "member leaves" — same RPC. */
export function useRemovePageMember() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    meta: { blocking: true },
    mutationFn: async ({ page_id, user_id }: { page_id: string; user_id: string }) => {
      const { error } = await supabase.rpc("remove_page_member", { p_page_id: page_id, p_user_id: user_id });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["page-members", variables.page_id] });
      queryClient.invalidateQueries({ queryKey: ["my-pages", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["active-identity", user?.id] });
    },
  });
}

/** Active organisational affiliations for a profile — the "X at Y"
 * chips shown alongside personal job/hobby tags (see AffiliationTags). */
export function useProfileAffiliations(userId: string) {
  return useQuery({
    queryKey: ["profile-affiliations", userId],
    queryFn: async (): Promise<PageAffiliation[]> => {
      const { data, error } = await supabase
        .from("page_members")
        .select(PAGE_AFFILIATION_SELECT)
        .eq("user_id", userId)
        .eq("status", "active");
      if (error) throw error;
      return toPageAffiliations(data as any[]);
    },
    enabled: !!userId,
  });
}

export function useIsFollowingPage(pageId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-following-page", pageId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("page_follows")
        .select("page_id")
        .eq("follower_id", user.id)
        .eq("page_id", pageId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!pageId,
  });
}

export function useTogglePageFollow(pageId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (currentlyFollowing: boolean) => {
      if (!user) throw new Error("Not signed in");

      if (currentlyFollowing) {
        const { error } = await supabase
          .from("page_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("page_id", pageId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("page_follows").insert({ follower_id: user.id, page_id: pageId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following-page", pageId] });
      queryClient.invalidateQueries({ queryKey: ["page"] });
    },
  });
}
