// src/hooks/usePosts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import type { PostWithAuthor } from "../types/database";

const PAGE_SIZE = 15;
export const POST_EDIT_WINDOW_MS = 15 * 60 * 1000;

// Posts from the last 7 days, ranked by comment_count, count as
// "Top Discussions". Simple and cheap for V1 — revisit if we want
// to fold likes/shares into the ranking too.
const TOP_DISCUSSIONS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const FEED_SELECT = `*, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, tier)`;

export function canEditPost(post: Pick<PostWithAuthor, "created_at">): boolean {
  return Date.now() - new Date(post.created_at).getTime() <= POST_EDIT_WINDOW_MS;
}

interface CreatePostInput {
  heading?: string;
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
        .select(FEED_SELECT)
        .eq("is_deleted", false)
        .eq("is_archived", false)
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
 * "Following" tab: posts authored by people the current user follows,
 * newest first. The follows table is keyed (follower_id, following_id),
 * so "who do I follow" is following_id for rows where follower_id = me.
 * Returns an empty page when signed out or following nobody, rather
 * than erroring, so the tab can render its own empty state.
 */
export function useFollowingFeed(page = 0) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["feed-posts", "following", user?.id, page],
    queryFn: async (): Promise<PostWithAuthor[]> => {
      if (!user) return [];

      const { data: follows, error: followsError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      if (followsError) throw followsError;

      const followingIds = (follows ?? []).map((f) => f.following_id);
      if (followingIds.length === 0) return [];

      const { data, error } = await supabase
        .from("posts")
        .select(FEED_SELECT)
        .in("author_id", followingIds)
        .eq("is_deleted", false)
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;
      return data as unknown as PostWithAuthor[];
    },
    enabled: !!user,
  });
}

/**
 * "Top Discussions" tab: posts from the last 7 days ranked by
 * comment_count. No auth required — same visibility rules as the
 * main feed (not deleted, not archived).
 */
export function useTopDiscussionsFeed(page = 0) {
  return useQuery({
    queryKey: ["feed-posts", "top", page],
    queryFn: async (): Promise<PostWithAuthor[]> => {
      const since = new Date(Date.now() - TOP_DISCUSSIONS_WINDOW_MS).toISOString();

      const { data, error } = await supabase
        .from("posts")
        .select(FEED_SELECT)
        .eq("is_deleted", false)
        .eq("is_archived", false)
        .gte("created_at", since)
        .order("comment_count", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
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

interface UpdatePostInput {
  post_id: string;
  heading?: string;
  content: string;
  category_id?: string | null;
  media_urls?: string[];
}

/**
 * Edits a post's content via the update-post edge function — same
 * reasoning as create-post: edits get re-moderated, and the
 * 15-minute window is enforced both there and at the DB level (see
 * the posts_enforce_edit_window trigger), so this can't be bypassed
 * by calling Supabase directly either.
 */
export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePostInput) => {
      const { data, error } = await supabase.functions.invoke("update-post", {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.post;
    },
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", post.id] });
    },
  });
}

/**
 * Soft-deletes a post the author owns. Goes straight through RLS
 * (no edge function needed) since no content is being written —
 * the "Authors can update their own posts" policy covers this, and
 * the edit-window trigger explicitly allows is_deleted to change at
 * any time regardless of the post's age.
 */
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("posts")
        .update({ is_deleted: true })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
    },
  });
}

/**
 * Archives/restores a post — same RLS path as delete. Archived
 * posts are hidden from the feed and from other people's view of
 * the profile, but stay visible to the owner via their own
 * "Archived" filter on their profile.
 */
export function useSetPostArchived() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, archived }: { postId: string; archived: boolean }) => {
      const { error } = await supabase
        .from("posts")
        .update({ is_archived: archived })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
    },
  });
}

/**
 * Fetches a user's own posts including archived ones, for the
 * "Archived" filter on their own profile. Only ever called with
 * includeArchived = true when the viewer is confirmed to be the
 * owner (see ProfilePage) — everyone else always gets the
 * archived-excluded view from useUserPosts in useProfile.ts.
 */
export function useUserPostsWithArchived(userId: string, includeArchived: boolean) {
  return useQuery({
    queryKey: ["user-posts", userId, "with-archived", includeArchived],
    queryFn: async (): Promise<PostWithAuthor[]> => {
      let query = supabase
        .from("posts")
        .select(`*, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, tier)`)
        .eq("author_id", userId)
        .eq("is_deleted", false);

      if (!includeArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as PostWithAuthor[];
    },
    enabled: !!userId,
  });
}
