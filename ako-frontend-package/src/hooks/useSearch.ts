import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { PostWithAuthor, Profile } from "../types/database";

/**
 * Uses the posts.search_vector generated tsvector column (see
 * 02_posts_reactions_comments.sql) — real Postgres full-text search,
 * not a naive ILIKE scan, so it handles word variants and ranks results.
 */
export function useSearchPosts(query: string) {
  return useQuery({
    queryKey: ["search-posts", query],
    queryFn: async (): Promise<PostWithAuthor[]> => {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .from("posts")
        .select(`*, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, tier)`)
        .eq("is_deleted", false)
        .textSearch("search_vector", query, { type: "websearch" })
        .limit(20);

      if (error) throw error;
      return data as unknown as PostWithAuthor[];
    },
    enabled: query.trim().length > 1,
  });
}

export function useSearchPeople(query: string) {
  return useQuery({
    queryKey: ["search-people", query],
    queryFn: async (): Promise<Profile[]> => {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_deleted", false)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: query.trim().length > 1,
  });
}
