import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { PROFILE_ROLES_SELECT, toProfileRoles } from "../lib/profileRoles";
import type { ReactionType } from "../types/database";

type TargetType = "post" | "comment" | "project";

const COLUMN_FOR: Record<TargetType, "post_id" | "comment_id" | "project_id"> = {
  post: "post_id",
  comment: "comment_id",
  project: "project_id",
};

/**
 * Checks whether the current user has already reacted to a post,
 * comment, or project with a given type. Generalized across posts and
 * comments since comments carry like_count/dislike_count columns too
 * (see 02_posts_reactions_comments.sql) that had no corresponding UI
 * until this was caught in review — and now projects, which carry a
 * like_count column of their own (see the project-reactions migration).
 */
export function useMyReaction(targetId: string, targetType: TargetType, type: ReactionType) {
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
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });
}

/**
 * Toggles a reaction on/off for a post, comment, or project. Reactions
 * go straight through RLS (no edge function needed) since they carry
 * no text and therefore don't need moderation.
 */
export function useToggleReaction(targetId: string, targetType: TargetType, type: ReactionType) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const column = COLUMN_FOR[targetType];

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
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reaction", targetType, targetId, type] });
      if (targetType === "post") {
        queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      } else if (targetType === "comment") {
        queryClient.invalidateQueries({ queryKey: ["comments"] });
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
