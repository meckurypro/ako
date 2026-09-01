// src/hooks/usePosts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { PROFILE_ROLES_SELECT, toProfileRoles } from "../lib/profileRoles";
import type { PostWithAuthor } from "../types/database";

const PAGE_SIZE = 15;
export const POST_EDIT_WINDOW_MS = 15 * 60 * 1000;

const TOP_DISCUSSIONS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const FEED_SELECT = `*, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, tier, ${PROFILE_ROLES_SELECT})`;

export function canEditPost(post: Pick<PostWithAuthor, "created_at">): boolean {
  return Date.now() - new Date(post.created_at).getTime() <= POST_EDIT_WINDOW_MS;
}

/** Normalises the raw Supabase shape → PostWithAuthor (flattens profile_roles → roles). */
function normalizePost(raw: any): PostWithAuthor {
  return {
    ...raw,
    author: raw.author
      ? { ...raw.author, roles: toProfileRoles(raw.author.profile_roles) }
      : raw.author,
  };
}

interface CreatePostInput {
  heading?: string;
  content: string;
  category_id?: string;
  interest_ids?: string[];
  media_urls?: string[];
}

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
      return (data as any[]).map(normalizePost);
    },
  });
}

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
      return (data as any[]).map(normalizePost);
    },
    enabled: !!user,
  });
}

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
      return (data as any[]).map(normalizePost);
    },
  });
}

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

export function useUserPostsWithArchived(userId: string, includeArchived: boolean) {
  return useQuery({
    queryKey: ["user-posts", userId, "with-archived", includeArchived],
    queryFn: async (): Promise<PostWithAuthor[]> => {
      let query = supabase
        .from("posts")
        .select(FEED_SELECT)
        .eq("author_id", userId)
        .eq("is_deleted", false);

      if (!includeArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map(normalizePost);
    },
    enabled: !!userId,
  });
}
