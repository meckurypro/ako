import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import type { ReactionType } from "../types/database";

type TargetType = "post" | "comment";

/**
 * Checks whether the current user has already reacted to a post OR
 * comment with a given type. Generalized beyond posts since comments
 * carry like_count/dislike_count columns too (see 02_posts_reactions_comments.sql)
 * that had no corresponding UI until this was caught in review.
 */
export function useMyReaction(targetId: string, targetType: TargetType, type: ReactionType) {
  const { user } = useAuth();
  const column = targetType === "post" ? "post_id" : "comment_id";

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
 * Toggles a reaction on/off for a post or comment. Reactions go
 * straight through RLS (no edge function needed) since they carry
 * no text and therefore don't need moderation.
 */
export function useToggleReaction(targetId: string, targetType: TargetType, type: ReactionType) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const column = targetType === "post" ? "post_id" : "comment_id";

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
      } else {
        queryClient.invalidateQueries({ queryKey: ["comments"] });
      }
    },
  });
}
