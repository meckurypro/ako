// src/hooks/useReactions.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { useSound } from "./useSound";
import { PROFILE_ROLES_SELECT, toProfileRoles } from "../lib/profileRoles";
import { DEBUG_DISABLE_PER_CARD_QUERIES } from "../lib/debugFlags";
import type { ReactionType } from "../types/database";

type TargetType = "post" | "comment" | "project";

const COLUMN_FOR: Record<TargetType, "post_id" | "comment_id" | "project_id"> = {
  post: "post_id",
  comment: "comment_id",
  project: "project_id",
};

/**
 * Checks whether the current user has already reacted to a post or
 * project with a given type. Comments no longer go through this hook
 * — see useMyCommentReactions below — because a thread with N
 * comments was mounting 2N of these (like + dislike, per comment),
 * which is what made reacting to comments feel unreliable: on a slow
 * connection that many concurrent requests queue, get rate-limited,
 * or lose the race with a fast second tap.
 *
 * `.limit(1)` before `.maybeSingle()` is deliberate, not redundant:
 * if a race ever produces more than one reaction row for the same
 * (user, target, type) — see 25_fix_reaction_duplicates.sql — PostgREST
 * throws on `.maybeSingle()` when the *query itself* would return more
 * than one row. Limiting to 1 first means this query degrades to "the
 * reaction still shows as active" instead of erroring out and getting
 * the like/dislike button stuck, even before that migration is applied
 * or if a duplicate ever slips through some other way.
 */
export function useMyReaction(targetId: string, targetType: "post" | "project", type: ReactionType) {
  const { user } = useAuth();
  const column = COLUMN_FOR[targetType];

  return useQuery({
    queryKey: ["my-reaction", targetType, targetId, type, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("reactions")
        .select("id")
        .eq(column, targetId)
        .eq("user_id", user.id)
        .eq("type", type)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !DEBUG_DISABLE_PER_CARD_QUERIES,
  });
}

// Postgres unique_violation — see the partial unique indexes added in
// 25_fix_reaction_duplicates.sql.
const UNIQUE_VIOLATION = "23505";

/**
 * Toggles a reaction on/off for a post or project. Reactions go
 * straight through RLS (no edge function needed) since they carry no
 * text and therefore don't need moderation.
 */
export function useToggleReaction(targetId: string, targetType: "post" | "project", type: ReactionType) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const column = COLUMN_FOR[targetType];
  const { play } = useSound();

  return useMutation({
    mutationFn: async (currentlyActive: boolean) => {
      if (!user) throw new Error("Not signed in");

      if (currentlyActive) {
        const { error } = await supabase
          .from("reactions")
          .delete()
          .eq(column, targetId)
          .eq("user_id", user.id)
          .eq("type", type);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reactions").insert({
          [column]: targetId,
          user_id: user.id,
          type,
          target_type: targetType,
        });
        // A second tap that landed before the first one's optimistic
        // state settled hits the unique index instead of creating a
        // duplicate — the end state (reacted) is already what this
        // call wanted, so treat it as a success rather than an error
        // toast the user didn't do anything to deserve.
        if (error && error.code !== UNIQUE_VIOLATION) throw error;
      }
    },
    onSuccess: (_data, currentlyActive) => {
      // currentlyActive is the state *before* this toggle — false means
      // this call just turned the reaction on, which is the only
      // direction worth a sound (un-liking shouldn't play anything).
      if (type === "like" && !currentlyActive) play("like");

      queryClient.invalidateQueries({ queryKey: ["my-reaction", targetType, targetId, type] });
      if (targetType === "post") {
        queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      } else {
        // Project like_count is read off several different queries
        // depending on where the card is rendered — profile tab,
        // detail page, or the "similar projects" rail — so all need
        // a refetch for the new count to show up everywhere.
        queryClient.invalidateQueries({ queryKey: ["user-projects"] });
        queryClient.invalidateQueries({ queryKey: ["project", targetId] });
        queryClient.invalidateQueries({ queryKey: ["project-detail", targetId] });
        queryClient.invalidateQueries({ queryKey: ["similar-projects"] });
        queryClient.invalidateQueries({ queryKey: ["saved-projects"] });
        queryClient.invalidateQueries({ queryKey: ["liked-projects"] });
      }
    },
  });
}

// --- Comment reactions -----------------------------------------------
//
// Comments get their own pair of hooks instead of reusing
// useMyReaction/useToggleReaction above. A comment thread can hold
// dozens of comments, and the old approach mounted one useMyReaction
// query per comment per reaction type (like + dislike), i.e. 2N
// requests just to paint the thread's reaction state. That's the
// likely cause of "liking/disliking a comment doesn't work" — on
// anything but a fast connection, some of those N+1 requests queue,
// time out, or get rate-limited, so the button's active state either
// never loads or loads inconsistently between comments. See the
// Supabase N+1 write-up: https://axonbuild.com/blog/n-plus-1-query-problem
//
// The fix: one batched query per post for all of the current user's
// comment reactions, plus an optimistic update on toggle so the
// button responds instantly instead of waiting on a round trip.

export interface CommentReactionState {
  liked: boolean;
  disliked: boolean;
}

type CommentReactionMap = Map<string, CommentReactionState>;

function commentReactionsQueryKey(postId: string, userId: string | undefined) {
  return ["my-comment-reactions", postId, userId] as const;
}

// Fetches every comment reaction the current user has anywhere in one
// post's thread, in a single request, instead of one request per
// comment per reaction type.
export function useMyCommentReactions(postId: string, commentIds: string[]) {
  const { user } = useAuth();
  const hasComments = commentIds.length > 0;

  return useQuery({
    queryKey: commentReactionsQueryKey(postId, user?.id),
    queryFn: async (): Promise<CommentReactionMap> => {
      const map: CommentReactionMap = new Map();
      if (!user || !hasComments) return map;

      const { data, error } = await supabase
        .from("reactions")
        .select("comment_id, type")
        .eq("user_id", user.id)
        .eq("target_type", "comment")
        .in("comment_id", commentIds);
      if (error) throw error;

      for (const row of data ?? []) {
        const entry = map.get(row.comment_id) ?? { liked: false, disliked: false };
        if (row.type === "like") entry.liked = true;
        if (row.type === "dislike") entry.disliked = true;
        map.set(row.comment_id, entry);
      }
      return map;
    },
    enabled: !!user && hasComments,
  });
}

interface ToggleCommentReactionInput {
  commentId: string;
  type: Extract<ReactionType, "like" | "dislike">;
  currentlyActive: boolean;
}

// Toggles a like or dislike on one comment. Shared across every
// comment in the thread (CommentThread creates one instance and
// passes it down), so a tap on any comment's button hits the same
// optimistic-update path.
export function useToggleCommentReaction(postId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = commentReactionsQueryKey(postId, user?.id);
  const { play } = useSound();

  return useMutation({
    mutationFn: async ({ commentId, type, currentlyActive }: ToggleCommentReactionInput) => {
      if (!user) throw new Error("Not signed in");

      if (currentlyActive) {
        const { error } = await supabase
          .from("reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id)
          .eq("type", type);
        if (error) throw error;
        return;
      }

      // Mutual exclusion: a like and a dislike from the same person on
      // the same comment shouldn't coexist. Clear the opposite type
      // first so switching from one to the other is one consistent
      // action rather than leaving both rows behind.
      const opposite = type === "like" ? "dislike" : "like";
      await supabase
        .from("reactions")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id)
        .eq("type", opposite);

      const { error } = await supabase.from("reactions").insert({
        comment_id: commentId,
        user_id: user.id,
        type,
        target_type: "comment",
      });
      // Same race as the post/project version above — a second tap
      // landing before the first settles hits the unique index rather
      // than creating a duplicate. Treat it as a no-op success.
      if (error && error.code !== UNIQUE_VIOLATION) throw error;
    },
    // Flip the button immediately rather than waiting on the round
    // trip — this is the other half of the reliability fix, since a
    // tap that visibly does nothing for a second or more reads as
    // "doesn't work" even when the request eventually succeeds.
    onMutate: async ({ commentId, type, currentlyActive }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CommentReactionMap>(queryKey);

      const next: CommentReactionMap = new Map(previous ?? []);
      const entry = { ...(next.get(commentId) ?? { liked: false, disliked: false }) };
      const nowActive = !currentlyActive;
      if (type === "like") {
        entry.liked = nowActive;
        if (nowActive) entry.disliked = false;
      } else {
        entry.disliked = nowActive;
        if (nowActive) entry.liked = false;
      }
      next.set(commentId, entry);
      queryClient.setQueryData(queryKey, next);

      if (type === "like" && nowActive) play("like");

      return { previous };
    },
    onError: (err, _vars, context) => {
      // Roll back to whatever the cache held before the optimistic
      // update so a failed request doesn't leave a button stuck
      // showing a reaction that was never actually saved.
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      // A reaction that reliably reverts the instant it's tapped means
      // the insert/delete itself is being rejected server-side (a
      // trigger error or constraint), not a flaky network blip — this
      // log is what distinguishes the two. See trg_notify_on_reaction /
      // notifications.type constraint as the current leading suspect.
      console.error("Comment reaction failed:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      // like_count/dislike_count on the comment row itself come from
      // this query, so it needs a refetch too for the visible number
      // to move.
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });
}

// Full list of posts the current user has liked — for the Activity
// hub's "Liked" tab. Same join shape as useBookmarkedPosts (roles
// included and flattened the same way PostCard requires elsewhere).
export function useLikedPosts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["liked-posts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reactions")
        .select(
          `post:posts!reactions_post_id_fkey(*, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, tier, is_private, ${PROFILE_ROLES_SELECT}))`
        )
        .eq("type", "like")
        .eq("target_type", "post")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((row: any) => row.post)
        .filter(Boolean)
        .map((post: any) => {
          const { profile_roles, ...author } = post.author ?? {};
          return { ...post, author: { ...author, roles: toProfileRoles(profile_roles) } };
        });
    },
    enabled: !!user,
  });
}

// Full list of projects the current user has liked — same pattern,
// for the Activity hub's "Liked" tab, Projects side.
export function useLikedProjects() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["liked-projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reactions")
        .select(`project:projects!reactions_project_id_fkey(*)`)
        .eq("type", "like")
        .eq("target_type", "project")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => row.project).filter(Boolean);
    },
    enabled: !!user,
  });
}
