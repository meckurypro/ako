// src/hooks/usePosts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { PROFILE_ROLES_SELECT, toProfileRoles } from "../lib/profileRoles";
import type { PostWithAuthor, RepostSource } from "../types/database";

const PAGE_SIZE = 15;
export const POST_EDIT_WINDOW_MS = 15 * 60 * 1000;

const TOP_DISCUSSIONS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const AUTHOR_SELECT = `id, username, display_name, avatar_url, tier, ${PROFILE_ROLES_SELECT}`;

// One level deep: the embedded reshared_post carries its own author but
// not a further-nested reshared_post, so repost-of-a-repost links to the
// immediate parent rather than recursing indefinitely.
const FEED_SELECT = `*, author:profiles!posts_author_id_fkey(${AUTHOR_SELECT}), reshared_post(*, author:profiles!posts_author_id_fkey(${AUTHOR_SELECT}))`;

export function canEditPost(post: Pick<PostWithAuthor, "created_at">): boolean {
  return Date.now() - new Date(post.created_at).getTime() <= POST_EDIT_WINDOW_MS;
}

function normalizeAuthor(raw: any) {
  return raw ? { ...raw, roles: toProfileRoles(raw.profile_roles) } : raw;
}

/** Normalises the raw Supabase shape → PostWithAuthor (flattens profile_roles → roles). */
function normalizePost(raw: any): PostWithAuthor {
  const reshared_post: RepostSource | null | undefined = raw.reshared_post
    ? { ...raw.reshared_post, author: normalizeAuthor(raw.reshared_post.author) }
    : raw.reshared_post;

  return {
    ...raw,
    author: normalizeAuthor(raw.author),
    reshared_post,
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

interface ReshareInput {
  originalPostId: string;
  /** Empty/omitted → plain reshare. Non-empty → quote. */
  caption?: string;
}

/**
 * Creates a reshare or quote (same row shape, distinguished by whether
 * `caption` is empty — see isPlainReshare/isQuote in types/database.ts).
 *
 * TODO(moderation): quote captions are new user-authored text and should
 * ideally pass through the same Claude-moderation edge function that
 * create-post uses, the way create-post itself does. That function's
 * source isn't in this repo, so this goes straight to the table for now —
 * same as useDeletePost/useSetPostArchived below. Route this through an
 * edge function instead once that source is available to extend.
 */
export function useCreateReshare() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ originalPostId, caption }: ReshareInput) => {
      if (!user) throw new Error("Not signed in");

      // Guard against double-resharing the same post — the UI already hides
      // the Reshare button once you've reshared, but this is a second line
      // of defense against races (two taps before the query cache updates,
      // stale UI, etc.) rather than relying on the client alone.
      const { data: existing } = await supabase
        .from("posts")
        .select("id")
        .eq("author_id", user.id)
        .eq("reshared_post_id", originalPostId)
        .eq("is_deleted", false)
        .maybeSingle();
      if (existing) throw new Error("You've already reshared this post.");

      const { data, error } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          content: caption?.trim() ?? "",
          reshared_post_id: originalPostId,
        })
        .select(FEED_SELECT)
        .single();
      if (error) {
        console.error("[useCreateReshare] Supabase error:", error);
        throw error;
      }
      return normalizePost(data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      queryClient.invalidateQueries({ queryKey: ["has-reshared", variables.originalPostId] });
    },
  });
}

/** Whether the current user has already reshared/quoted the given post — used
 * to hide the Reshare button (you can only reshare a given post once). */
export function useHasReshared(postId: string, enabled: boolean = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["has-reshared", postId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("posts")
        .select("id")
        .eq("author_id", user.id)
        .eq("reshared_post_id", postId)
        .eq("is_deleted", false)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && enabled,
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
