import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Comment, Stance } from "../types/database";

export interface CommentWithAuthor extends Comment {
  author: { id: string; username: string; display_name: string; avatar_url: string | null };
}

export interface CommentNode extends CommentWithAuthor {
  replies: CommentNode[];
}

/**
 * Fetches ALL comments for a post in one query and builds the reply
 * tree client-side. Simpler than paginated nested queries, and fine
 * at V1 scale — worth revisiting if threads get genuinely huge.
 */
export function useComments(postId: string) {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: async (): Promise<CommentNode[]> => {
      const { data, error } = await supabase
        .from("comments")
        .select(`*, author:profiles!comments_author_id_fkey(id, username, display_name, avatar_url)`)
        .eq("post_id", postId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const flat = data as unknown as CommentWithAuthor[];
      const byId = new Map<string, CommentNode>();
      const roots: CommentNode[] = [];

      for (const c of flat) {
        byId.set(c.id, { ...c, replies: [] });
      }
      for (const c of flat) {
        const node = byId.get(c.id)!;
        if (c.parent_comment_id) {
          byId.get(c.parent_comment_id)?.replies.push(node);
        } else {
          roots.push(node);
        }
      }

      return roots;
    },
  });
}

interface CreateCommentInput {
  post_id: string;
  content: string;
  stance?: Stance;
  parent_comment_id?: string;
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCommentInput) => {
      const { data, error } = await supabase.functions.invoke("create-comment", {
        body: input,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data.comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}
