// src/hooks/useHashtags.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { PostWithAuthor } from "../types/database";

/**
 * Posts tagged with a given hashtag, via the post_hashtags join
 * table that create-post already populates. Powers the /hashtag/:tag
 * page that tapping a "#tag" in a post's content links to.
 */
export function useHashtagPosts(tag: string) {
  return useQuery({
    queryKey: ["hashtag-posts", tag],
    queryFn: async (): Promise<PostWithAuthor[]> => {
      const { data: hashtag } = await supabase
        .from("hashtags")
        .select("id")
        .eq("tag", tag.toLowerCase())
        .maybeSingle();

      if (!hashtag) return [];

      const { data: links } = await supabase
        .from("post_hashtags")
        .select("post_id")
        .eq("hashtag_id", hashtag.id);

      const postIds = (links ?? []).map((l) => l.post_id);
      if (postIds.length === 0) return [];

      const { data, error } = await supabase
        .from("posts")
        .select(`*, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, tier)`)
        .in("id", postIds)
        .eq("is_deleted", false)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as PostWithAuthor[];
    },
    enabled: !!tag,
  });
}
