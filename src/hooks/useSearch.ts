import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { PROFILE_ROLES_SELECT, toProfileRoles } from "../lib/profileRoles";
import type { PostWithAuthor, Profile } from "../types/database";

const PEOPLE_SELECT = `id, username, display_name, avatar_url, tier, follower_count, ${PROFILE_ROLES_SELECT}`;

function normalizeProfile(raw: any): Profile {
  return { ...raw, roles: toProfileRoles(raw.profile_roles) };
}

// Cached follows + followers graph — shared across hooks, stale for 5 min
// so scoring doesn't refetch on every keystroke.
function useSocialGraph() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["social-graph", user?.id],
    queryFn: async () => {
      if (!user) return { followingIds: new Set<string>(), followerIds: new Set<string>() };
      const [fwingRes, fwersRes] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", user.id),
        supabase.from("follows").select("follower_id").eq("following_id", user.id),
      ]);
      return {
        followingIds: new Set((fwingRes.data ?? []).map((f) => f.following_id)),
        followerIds: new Set((fwersRes.data ?? []).map((f) => f.follower_id)),
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// Cached engagement graph — who has reacted to my posts, and whose posts I've
// reacted to. Runs 4 queries in 2 serial rounds, so it's cached separately
// from the social graph and only blocks search scoring, not the profile fetch.
function useEngagementGraph() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["engagement-graph", user?.id],
    queryFn: async () => {
      const engagedIds = new Set<string>();
      if (!user) return engagedIds;

      const [myPostsRes, myReactedRes] = await Promise.all([
        supabase.from("posts").select("id").eq("author_id", user.id).limit(50),
        supabase.from("reactions").select("post_id").eq("user_id", user.id).limit(50),
      ]);

      const myPostIds = (myPostsRes.data ?? []).map((p) => p.id);
      const reactedPostIds = (myReactedRes.data ?? []).map((r) => r.post_id);

      const [reactorsRes, authorRes] = await Promise.all([
        myPostIds.length > 0
          ? supabase.from("reactions").select("user_id").in("post_id", myPostIds).neq("user_id", user.id)
          : { data: [] },
        reactedPostIds.length > 0
          ? supabase.from("posts").select("author_id").in("id", reactedPostIds).neq("author_id", user.id)
          : { data: [] },
      ]);

      (reactorsRes.data ?? []).forEach((r: any) => engagedIds.add(r.user_id));
      (authorRes.data ?? []).forEach((p: any) => engagedIds.add(p.author_id));
      return engagedIds;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

function scoreProfile(
  id: string,
  followingIds: Set<string>,
  followerIds: Set<string>,
  engagedIds: Set<string>
): number {
  if (followingIds.has(id)) return 4;   // I follow them
  if (followerIds.has(id)) return 3;    // They follow me
  if (engagedIds.has(id)) return 2;     // Engagement overlap
  return 0;
}

/**
 * "People to follow" shown on the empty Discover state.
 * Excludes already-followed users; surfaces followers-not-followed-back
 * first, then everyone else ranked by follower_count.
 */
export function useSuggestedPeople() {
  const { user } = useAuth();
  const { data: graph } = useSocialGraph();

  return useQuery({
    queryKey: ["suggested-people", user?.id, !!graph],
    queryFn: async (): Promise<Profile[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select(PEOPLE_SELECT)
        .eq("is_deleted", false)
        .neq("id", user.id)
        .order("follower_count", { ascending: false })
        .limit(30);

      if (error) throw error;

      const followingIds = graph?.followingIds ?? new Set<string>();
      const followerIds = graph?.followerIds ?? new Set<string>();

      return (data ?? [])
        .map(normalizeProfile)
        .filter((p) => !followingIds.has(p.id)) // hide already-followed
        .map((p) => ({ p, score: followerIds.has(p.id) ? 2 : 0 }))
        .sort((a, b) => b.score - a.score || b.p.follower_count - a.p.follower_count)
        .slice(0, 12)
        .map((s) => s.p);
    },
    enabled: !!user && !!graph,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Smart people search. Profile fetch and graph lookups run in parallel
 * (graphs are cached), scoring happens instantly once both resolve.
 * Priority: following > followers > engagement overlap > everyone else.
 */
export function useSearchPeople(query: string) {
  const { user } = useAuth();
  const { data: graph } = useSocialGraph();
  const { data: engagedIds } = useEngagementGraph();

  return useQuery({
    queryKey: ["search-people", query, user?.id],
    queryFn: async (): Promise<Profile[]> => {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select(PEOPLE_SELECT)
        .eq("is_deleted", false)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(30);

      if (error) throw error;

      const followingIds = graph?.followingIds ?? new Set<string>();
      const followerIds = graph?.followerIds ?? new Set<string>();
      const engaged = engagedIds ?? new Set<string>();

      return (data ?? [])
        .map(normalizeProfile)
        .map((p) => ({ p, score: scoreProfile(p.id, followingIds, followerIds, engaged) }))
        .sort((a, b) => b.score - a.score)
        .map((s) => s.p);
    },
    enabled: query.trim().length > 1,
  });
}

/**
 * Full-text post search via the search_vector tsvector column.
 * Uses websearch mode so queries like "AI startup nigeria" just work.
 */
export function useSearchPosts(query: string) {
  return useQuery({
    queryKey: ["search-posts", query],
    queryFn: async (): Promise<PostWithAuthor[]> => {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .from("posts")
        .select(
          `*, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, tier, ${PROFILE_ROLES_SELECT})`
        )
        .eq("is_deleted", false)
        .eq("is_archived", false)
        .textSearch("search_vector", query, { type: "websearch" })
        .limit(20);

      if (error) throw error;

      return (data as any[]).map((raw) => ({
        ...raw,
        author: raw.author
          ? { ...raw.author, roles: toProfileRoles(raw.author.profile_roles) }
          : raw.author,
      }));
    },
    enabled: query.trim().length > 1,
  });
        }
