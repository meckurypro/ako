// src/pages/PostDetail.tsx
import { useRef, useState } from "react";
import { Navigate, useParams, useLocation } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useMarkPostSeen } from "../hooks/useMarkPostSeen";
import { usePost } from "../hooks/usePostDetail";
import { PostCard } from "../components/PostCard";
import { StanceComposer } from "../components/StanceComposer";
import { BottomNav } from "../components/BottomNav";
import { UnavailableNotice } from "../components/UnavailableNotice";
import { CommentEngagementProvider } from "../components/comments/CommentEngagement";
import { CommentReplies } from "../components/comments/CommentReplies";
import { ReplyBar } from "../components/comments/ReplyBar";
import type { Stance } from "../types/database";

// Older share links and notifications pointed at /post/{id}#comment-{commentId}. Comments are pages of their
// own now, so those links are forwarded to the opened-comment page instead of going stale.
function legacyCommentIdFromHash(hash: string): string | null {
  const match = /^#comment-(.+)$/.exec(hash);
  return match ? match[1] : null;
}

/**
 * A post, opened. The post sits at the top (opening it counts as a view), its direct replies follow right
 * beneath it on the same page — no overlay, nothing to close. Each reply is tinted by its stance toward the
 * post; tapping one opens it as the parent of its own thread (see CommentDetail).
 */
export function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const location = useLocation();
  const smartBack = useSmartBack();
  const { user } = useAuth();
  const { data: post, isLoading: postLoading } = usePost(postId);
  const repliesRef = useRef<HTMLDivElement>(null);
  const [composeStance, setComposeStance] = useState<Stance | null>(null);

  useMarkPostSeen(postId!, post?.author?.id);

  const legacyCommentId = legacyCommentIdFromHash(location.hash);
  if (legacyCommentId) return <Navigate to={`/post/${postId}/comment/${legacyCommentId}`} replace />;

  // Only reachable at all (row returned despite is_deleted/is_archived)
  // if the viewer is the author or an admin — RLS hides removed posts
  // from everyone else. A stranger hitting a dead link gets `post ===
  // null` below instead, with no attribution since we have nothing
  // (correctly) to tell them.
  const isOwnPost = !!user && !!post && post.author?.id === user.id;
  const removedByViewer = !!user && post?.deleted_by === user.id;
  const removerName = post?.remover?.display_name || post?.remover?.username;

  const showThread = !!post && !post.is_deleted && !(post.is_archived && !isOwnPost);

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-24">
      <div className="max-w-xl mx-auto">
        <button onClick={smartBack} className="text-ink-muted mb-3" aria-label="Back">
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

            <PostCard
              post={post}
              showStats
              onRequestOpenComments={() => repliesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />
          </>
        )}

        {showThread && post && (
          <CommentEngagementProvider key={post.id} postId={post.id}>
            <div ref={repliesRef} className="scroll-mt-16">
              <ReplyBar
                placeholder="Add your reasoning…"
                // The post's own author can only build on their own post.
                stances={isOwnPost ? ["support"] : undefined}
                onOpen={setComposeStance}
              />
              <CommentReplies
                postId={post.id}
                parentCommentId={null}
                total={post.comment_count}
                counts={{
                  support: post.support_count,
                  disagree: post.disagree_count,
                  pushback: post.pushback_count,
                }}
              />
            </div>

            {composeStance && (
              <StanceComposer
                postId={post.id}
                stance={composeStance}
                stances={isOwnPost ? ["support"] : undefined}
                onClose={() => setComposeStance(null)}
              />
            )}
          </CommentEngagementProvider>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
