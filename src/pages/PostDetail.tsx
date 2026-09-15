// src/pages/PostDetail.tsx
import { useParams } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useComments } from "../hooks/useComments";
import { useMarkPostSeen } from "../hooks/useMarkPostSeen";
import { PostCard } from "../components/PostCard";
import { CommentThread } from "../components/CommentThread";
import { BottomNav } from "../components/BottomNav";
import { UnavailableNotice } from "../components/UnavailableNotice";
import { PROFILE_ROLES_SELECT, toProfileRoles } from "../lib/profileRoles";
import type { PostWithAuthor } from "../types/database";

const POST_SELECT = `*, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, tier, is_private, ${PROFILE_ROLES_SELECT}), remover:profiles!posts_deleted_by_fkey(username, display_name)`;

interface PostDetailData extends PostWithAuthor {
  is_deleted: boolean;
  is_archived: boolean;
  deleted_by: string | null;
  remover: { username: string; display_name: string } | null;
}

function usePost(postId: string) {
  return useQuery({
    queryKey: ["post", postId],
    queryFn: async (): Promise<PostDetailData | null> => {
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .eq("id", postId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null; // RLS hid it entirely — deleted/archived and viewer has no special access

      const raw = data as any;
      return {
        ...raw,
        author: raw.author
          ? { ...raw.author, roles: toProfileRoles(raw.author.profile_roles) }
          : raw.author,
      } as PostDetailData;
    },
    enabled: !!postId,
  });
}

export function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const smartBack = useSmartBack();
  const { user } = useAuth();
  const { data: post, isLoading: postLoading } = usePost(postId!);
  const { data: comments, isLoading: commentsLoading } = useComments(postId!);

  useMarkPostSeen(postId!, post?.author?.id);

  // Only reachable at all (row returned despite is_deleted/is_archived)
  // if the viewer is the author or an admin — RLS hides removed posts
  // from everyone else. A stranger hitting a dead link gets `post ===
  // null` below instead, with no attribution since we have nothing
  // (correctly) to tell them.
  const isOwnPost = !!user && !!post && post.author?.id === user.id;
  const removedByViewer = !!user && post?.deleted_by === user.id;
  const removerName = post?.remover?.display_name || post?.remover?.username;

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-24">
      <div className="max-w-xl mx-auto">
        <button onClick={smartBack} className="text-ink-muted mb-3">
          <ArrowLeft size={22} />
        </button>

        {postLoading ? (
          <p className="text-ink-muted">Loading…</p>
        ) : !post ? (
          <UnavailableNotice kind="post" />
        ) : post.is_deleted ? (
          <UnavailableNotice
            kind="post"
            reason={removedByViewer ? "You deleted this post." : removerName ? `${removerName} removed this post.` : undefined}
          />
        ) : post.is_archived && !isOwnPost ? (
          <UnavailableNotice kind="post" />
        ) : (
          <>
            {post.is_archived && isOwnPost && (
              <p className="text-xs text-ink-muted bg-surface border border-border rounded-lg px-3 py-2 mb-3">
                Only you can see this — you archived it.
              </p>
            )}

            <PostCard post={post} showStats />

            {/* id="discussion" + scroll-mt-4 lets PostCard's comment tray
                button scroll here smoothly when already on the detail page. */}
            <h3
              id="discussion"
              className="font-display text-lg text-ink mt-6 mb-2 scroll-mt-4"
            >
              Discussion
            </h3>

            {commentsLoading ? (
              <p className="text-ink-muted text-sm">Loading responses…</p>
            ) : (
              <CommentThread comments={comments ?? []} postId={post.id} />
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
