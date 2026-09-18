// src/pages/PostDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useMarkPostSeen } from "../hooks/useMarkPostSeen";
import { PostCard } from "../components/PostCard";
import { CommentSheet } from "../components/CommentSheet";
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

// Notifications link here as /post/{id}#comment-{targetId} (see
// Notifications.tsx) — pulled out so the sheet can auto-open the right
// Replies panel and flash the target comment instead of relying on the
// browser's native anchor scroll, which doesn't reach into a portaled
// fixed-position sheet.
function highlightIdFromHash(hash: string): string | null {
  const match = /^#comment-(.+)$/.exec(hash);
  return match ? match[1] : null;
}

export function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const location = useLocation();
  const smartBack = useSmartBack();
  const { user } = useAuth();
  const { data: post, isLoading: postLoading } = usePost(postId!);
  const highlightId = highlightIdFromHash(location.hash);

  // Reaching this page normally ("the whole point of this page is the
  // discussion") auto-opens the comment sheet on top of the post — but
  // RepostBadge links here with `?view=post` when the intent is just
  // "show me the original post" (e.g. jumping from a reshare on the
  // feed), not its comments. In that mode comments start closed and the
  // visitor can still open them from the comment count like anywhere
  // else — see onRequestOpenComments below — and closing them returns
  // to viewing the post in place instead of leaving the page.
  const viewOnly = new URLSearchParams(location.search).get("view") === "post";
  const [manuallyOpened, setManuallyOpened] = useState(false);
  // Reset if the visitor lands on a different post (e.g. tapping another
  // RepostBadge without a full page reload in between).
  useEffect(() => setManuallyOpened(false), [postId]);
  const commentsOpen = highlightId ? true : viewOnly ? manuallyOpened : true;

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

            <PostCard post={post} showStats onRequestOpenComments={() => setManuallyOpened(true)} />

            {/* The whole point of this page is normally the discussion, so
                the comment overlay opens by itself over the post above —
                same immersive sheet PostCard opens inline elsewhere, just
                without a tap needed to get here. In `?view=post` mode
                (reached via RepostBadge — "show me the original post",
                not its comments) it starts closed instead, and opening
                it from the comment count just closes back to viewing the
                post in place rather than leaving the page — see
                commentsOpen/onClose below. */}
            {commentsOpen && (
              <CommentSheet
                postId={post.id}
                commentCount={post.comment_count}
                isOwner={!!user && post.author?.id === user.id}
                highlightId={highlightId}
                onClose={viewOnly ? () => setManuallyOpened(false) : smartBack}
              />
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
