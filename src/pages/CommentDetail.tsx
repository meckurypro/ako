// src/pages/CommentDetail.tsx
import { useLayoutEffect, useRef } from "react";
import { Link, Navigate, useNavigationType, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useSmartBack } from "../hooks/useSmartBack";
import { useComment, useCommentChain } from "../hooks/useComments";
import { useRecordCommentView } from "../hooks/useCommentViews";
import { usePost } from "../hooks/usePostDetail";
import { useMarkPostSeen } from "../hooks/useMarkPostSeen";
import { BottomNav } from "../components/BottomNav";
import { UnavailableNotice } from "../components/UnavailableNotice";
import { RestrictedPostNotice } from "../components/RestrictedPostNotice";
import { useIsRestricted } from "../hooks/useAccountAccess";
import { CommentEngagementProvider, useCommentEngagement } from "../components/comments/CommentEngagement";
import { CommentFocal } from "../components/comments/CommentFocal";
import { CommentReplies } from "../components/comments/CommentReplies";
import { ReplyBar } from "../components/comments/ReplyBar";
import { ThreadContextGap, ThreadContextRow } from "../components/comments/ThreadContextRow";
import { timeAgoCompact } from "../components/comments/stance";
import { renderFormattedText } from "../lib/formatText";
import type { CommentWithAuthor } from "../hooks/useComments";
import type { PostDetailData } from "../hooks/usePostDetail";

function PostContext({ post }: { post: PostDetailData | null | undefined }) {
  if (!post || post.is_deleted || post.is_archived) {
    return <ThreadContextGap label="The original post isn't available." />;
  }
  const name = post.posted_as_page?.name ?? post.author.display_name;
  const avatar = post.posted_as_page?.avatar_url ?? post.author.avatar_url;
  const text = post.content.trim() || post.heading || "Shared a post";
  return (
    <ThreadContextRow to={`/post/${post.id}`} name={name} avatarUrl={avatar} meta={`· ${timeAgoCompact(post.created_at)}`}>
      {post.heading && post.content.trim() ? <span className="font-medium text-ink">{post.heading} </span> : null}
      {renderFormattedText(text, "p")}
    </ThreadContextRow>
  );
}

function AncestorChain({ chain, postId }: { chain: (CommentWithAuthor | null)[]; postId: string }) {
  return (
    <>
      {chain.map((c, i) =>
        c ? (
          <ThreadContextRow
            key={c.id}
            to={`/post/${postId}/comment/${c.id}`}
            name={c.author.display_name}
            avatarUrl={c.author.avatar_url}
            meta={`· ${timeAgoCompact(c.created_at)}`}
          >
            {renderFormattedText(c.content, "c")}
          </ThreadContextRow>
        ) : (
          <ThreadContextGap key={`gap-${i}`} label="This comment isn't available." />
        )
      )}
    </>
  );
}

function CommentThreadBody({ comment }: { comment: CommentWithAuthor }) {
  const eng = useCommentEngagement();
  return (
    <>
      <ReplyBar placeholder={`Reply to ${comment.author.display_name}…`} onOpen={(s) => eng.reply(comment, s)} />
      <CommentReplies
        postId={comment.post_id}
        parentCommentId={comment.id}
        total={comment.reply_count}
        counts={{ support: comment.support_count, disagree: comment.disagree_count, pushback: comment.pushback_count }}
      />
    </>
  );
}

/**
 * A comment, opened — it becomes the "parent" of its own thread exactly like a post does: the conversation
 * above it (the post, then each comment down to this one) is shown quietly for context, the comment itself is
 * laid out large and neutral, and its replies follow below tinted by their stance toward IT. Opening it counts
 * as a view of the comment.
 */
export function CommentDetail() {
  const { postId, commentId } = useParams<{ postId: string; commentId: string }>();
  const smartBack = useSmartBack();
  const navigationType = useNavigationType();
  // Restricted accounts can't use posts yet: skip every fetch and explain instead of implying the link is dead.
  const restricted = useIsRestricted();
  const { data: comment, isLoading: commentLoading } = useComment(restricted ? undefined : commentId);
  const { data: chain, isLoading: chainLoading } = useCommentChain(restricted ? undefined : commentId);
  const { data: post, isLoading: postLoading } = usePost(restricted ? undefined : postId);
  const focalRef = useRef<HTMLDivElement>(null);

  useRecordCommentView(comment?.id, comment?.author.id);
  // Opening a comment is also being in that post's conversation — keep the post's "seen" bookkeeping honest.
  useMarkPostSeen(postId!, restricted ? undefined : post?.author?.id);

  const ready = !!comment && !!chain && !postLoading;

  // Like a conversation view: when there's context above, start with the opened comment at the top and let the
  // context sit just above the fold. Skipped on back/forward — ScrollToTop restores where you were instead.
  useLayoutEffect(() => {
    if (!ready || navigationType === "POP") return;
    focalRef.current?.scrollIntoView({ block: "start" });
  }, [ready, commentId, navigationType]);

  if (comment && postId && comment.post_id !== postId) {
    return <Navigate to={`/post/${comment.post_id}/comment/${comment.id}`} replace />;
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pb-24">
      <div className="max-w-xl mx-auto">
        <header className="sticky top-0 z-[15] -mx-4 px-4 py-3 bg-canvas/90 backdrop-blur-overlay flex items-center gap-4">
          <button onClick={smartBack} className="text-ink-muted" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <h1 className="font-display text-base text-ink">Comment</h1>
        </header>

        {restricted ? (
          <RestrictedPostNotice />
        ) : commentLoading || chainLoading ? (
          <p className="text-ink-muted py-6">Loading…</p>
        ) : !comment || comment.is_deleted ? (
          <div>
            <UnavailableNotice kind="comment" />
            {postId && (
              <p className="text-center">
                <Link to={`/post/${postId}`} className="text-sm font-medium text-accent">
                  View the post
                </Link>
              </p>
            )}
          </div>
        ) : (
          <CommentEngagementProvider key={comment.id} postId={comment.post_id}>
            <PostContext post={post} />
            <AncestorChain chain={chain ?? []} postId={comment.post_id} />

            {/* scroll-mt clears the sticky header when this is scrolled to the top */}
            <div ref={focalRef} className="scroll-mt-14">
              <CommentFocal comment={comment} />
            </div>

            <CommentThreadBody comment={comment} />
          </CommentEngagementProvider>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
