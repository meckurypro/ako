// src/pages/PostDetail.tsx
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useComments } from "../hooks/useComments";
import { useMarkPostSeen } from "../hooks/useMarkPostSeen";
import { PostCard } from "../components/PostCard";
import { CommentThread } from "../components/CommentThread";
import { PROFILE_ROLES_SELECT, toProfileRoles } from "../lib/profileRoles";
import type { PostWithAuthor } from "../types/database";

const POST_SELECT = `*, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, tier, ${PROFILE_ROLES_SELECT})`;

function usePost(postId: string) {
  return useQuery({
    queryKey: ["post", postId],
    queryFn: async (): Promise<PostWithAuthor> => {
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .eq("id", postId)
        .single();
      if (error) throw error;

      const raw = data as any;
      return {
        ...raw,
        author: raw.author
          ? { ...raw.author, roles: toProfileRoles(raw.author.profile_roles) }
          : raw.author,
      } as PostWithAuthor;
    },
    enabled: !!postId,
  });
}

export function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { data: post, isLoading: postLoading } = usePost(postId!);
  const { data: comments, isLoading: commentsLoading } = useComments(postId!);

  useMarkPostSeen(postId!, post?.author?.id);

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-24">
      <div className="max-w-xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-ink-muted mb-3">
          <ArrowLeft size={22} />
        </button>

        {postLoading || !post ? (
          <p className="text-ink-muted">Loading…</p>
        ) : (
          <>
            <PostCard post={post} />

            <h3 className="font-display text-lg text-ink mt-6 mb-2">Discussion</h3>

            {commentsLoading ? (
              <p className="text-ink-muted text-sm">Loading responses…</p>
            ) : (
              <CommentThread comments={comments ?? []} postId={post.id} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
