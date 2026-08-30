import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { PostWithAuthor } from "../types/database";

const PAGE_SIZE = 15;

interface CreatePostInput {
  content: string;
  category_id?: string;
  interest_ids?: string[];
  media_urls?: string[];
}

/**
 * Fetches the feed, optionally filtered to a single interest (used by
 * the Topics page). Simple offset pagination via "Load more" rather
 * than true infinite scroll — good enough for V1, easy to upgrade later.
 */
export function useFeedPosts(interestId?: string, page = 0) {
  return useQuery({
    queryKey: ["feed-posts", interestId ?? "all", page],
    queryFn: async (): Promise<PostWithAuthor[]> => {
      let query = supabase
        .from("posts")
        .select(
          `*, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, tier)`
        )
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (interestId) {
        // Filter to posts tagged with this interest via post_topics
        const { data: postIds } = await supabase
          .from("post_topics")
          .select("post_id")
          .eq("interest_id", interestId);

        const ids = (postIds ?? []).map((p) => p.post_id);
        if (ids.length === 0) return [];
        query = query.in("id", ids);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PostWithAuthor[];
    },
  });
}

/**
 * Creates a post via the create-post edge function — never inserts
 * directly, since moderation gating happens there (see migration 10,
 * which removed the direct-insert RLS policy entirely).
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const { data, error } = await supabase.functions.invoke("create-post", {
        body: input,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data.post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}
