// src/hooks/useUnseenPosts.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export interface UnseenPostMap {
  [authorId: string]: string; // authorId -> earliest unseen post id
}

/**
 * For a given set of author ids (the people in your chat list), finds
 * each author's EARLIEST post from the last 24h that the current user
 * hasn't viewed yet (per post_views). Drives the "status ring" on chat
 * avatars — same idea as WhatsApp/IG status rings, but for feed posts.
 */
export function useUnseenPosts(authorIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unseen-posts", user?.id, [...authorIds].sort()],
    queryFn: async (): Promise<UnseenPostMap> => {
      if (!authorIds.length) return {};

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: posts, error } = await supabase
        .from("posts")
        .select("id, author_id, created_at")
        .in("author_id", authorIds)
        .eq("is_deleted", false)
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!posts?.length) return {};

      const { data: views, error: viewsError } = await supabase
        .from("post_views")
        .select("post_id")
        .eq("user_id", user!.id)
        .in("post_id", posts.map((p) => p.id));

      if (viewsError) throw viewsError;

      const seenIds = new Set((views ?? []).map((v) => v.post_id));

      const map: UnseenPostMap = {};
      for (const post of posts) {
        // posts is already ordered oldest-first, so the first unseen
        // post we hit per author is the earliest one — skip if we
        // already found one for this author.
        if (seenIds.has(post.id)) continue;
        if (map[post.author_id]) continue;
        map[post.author_id] = post.id;
      }

      return map;
    },
    enabled: !!user && authorIds.length > 0,
    staleTime: 30_000,
  });
}
