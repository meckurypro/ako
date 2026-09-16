// src/components/CommentSheet.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ThumbsDown, X } from "lucide-react";
import { Avatar } from "./Avatar";
import { LikeHeart } from "./LikeHeart";
import { Portal } from "./Portal";
import { StanceComposer, STANCE_COLORS } from "./StanceComposer";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { useComments, type CommentNode } from "../hooks/useComments";
import {
  useMyCommentReactions,
  useToggleCommentReaction,
  type CommentReactionState,
} from "../hooks/useReactions";
import { formatCompactCount } from "../lib/formatStats";
import { renderFormattedText } from "../lib/formatText";
import type { Stance } from "../types/database";

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// Every comment id in the tree — see the identical helper in
// CommentThread.tsx for why reactions are fetched in one batch.
function flattenAllIds(nodes: CommentNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: CommentNode[]) => {
    for (const n of list) {
      ids.push(n.id);
      if (n.replies.length > 0) walk(n.replies);
    }
  };
  walk(nodes);
  return ids;
}

// Total secondary + tertiary + ... replies under a primary comment —
// the number shown on its "N replies" toggle, matching how YouTube/IG
// count a whole sub-thread rather than just direct children.
function countDescendants(node: CommentNode): number {
  let count = 0;
  for (const r of node.replies) count += 1 + countDescendants(r);
  return count;
}

function findNode(nodes: CommentNode[], id: string): CommentNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.replies, id);
    if (found) return found;
  }
  return null;
}

// Which primary (root) comment, if any, has the target id somewhere in
// its reply tree — used to auto-open the right Replies panel when a
// notification link points at a nested comment.
function findRootContaining(roots: CommentNode[], id: string): CommentNode | null {
  for (const root of roots) {
    if (root.id === id) return null; // it's a primary comment itself — no panel to open
    if (findNode(root.replies, id)) return root;
  }
  return null;
}

// A primary comment's whole reply tree, flattened into one ordered
// list for its Replies panel. Real apps (YouTube, IG) don't keep
// drilling into a fresh panel per depth beyond this — secondary and
// tertiary+ replies all render together here, with tertiary+ getting
// one extra indent step (capped, not compounding) so lineage still
// reads without the panel creeping ever-narrower.
interface FlatReply {
  comment: CommentNode;
  depth: number;
}
function flattenReplies(node: CommentNode, depth = 1): FlatReply[] {
  const out: FlatReply[] = [];
  for (const reply of node.replies) {
    out.push({ comment: reply, depth });
    out.push(...flattenReplies(reply, depth + 1));
  }
  return out;
}

type ToggleReaction = (input: {
  commentId: string;
  type: "like" | "dislike";
  currentlyActive: boolean;
}) => void;

interface CommentRowProps {
  comment: CommentNode;
  postId: string;
  indent?: boolean;
  highlightId?: string | null;
  reactions: Map<string, CommentReactionState> | undefined;
  onToggleReaction: ToggleReaction;
  replyCount?: number;
  onOpenReplies?: () => void;
}

function CommentRow({
  comment,
  postId,
  indent = false,
  highlightId,
  reactions,
  onToggleReaction,
  replyCount,
  onOpenReplies,
}: CommentRowProps) {
  const [replyStance, setReplyStance] = useState<Stance | null>(null);
  const stanceColors = comment.stance ? STANCE_COLORS[comment.stance] : null;
  const ref = useRef<HTMLDivElement>(null);
  const isTarget = !!highlightId && comment.id === highlightId;
  const [flashing, setFlashing] = useState(isTarget);

  const reactionState = reactions?.get(comment.id);
  const isLiked = !!reactionState?.liked;
  const isDisliked = !!reactionState?.disliked;

  useEffect(() => {
    if (!isTarget || !ref.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashing(true);
    const timeout = setTimeout(() => setFlashing(false), 2500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTarget]);

  return (
    <div
      id={`comment-${comment.id}`}
      ref={ref}
      className={`${indent ? "ml-5 border-l border-border pl-3" : ""} mt-4 rounded-lg transition-colors duration-700 ${
        flashing ? "bg-highlight -mx-2 px-2 py-1.5" : ""
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Link to={`/profile/${comment.author.username}`}>
          <Avatar src={comment.author.avatar_url} name={comment.author.display_name} size="sm" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/profile/${comment.author.username}`}
              className="text-sm font-medium text-ink hover:underline"
            >
              {comment.author.display_name}
            </Link>
            {stanceColors && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stanceColors.pillClass}`}>
                {stanceColors.label}
              </span>
            )}
            <span className="text-xs text-ink-muted">{timeAgo(comment.created_at)}</span>
          </div>

          <p className="text-sm text-ink mt-1 whitespace-pre-wrap break-words">
            {renderFormattedText(comment.content, "c")}
          </p>

          <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 mt-2.5">
            <button
              onClick={() =>
                onToggleReaction({ commentId: comment.id, type: "like", currentlyActive: isLiked })
              }
              className="flex items-center gap-1.5 text-danger -ml-1.5 p-1.5"
            >
              <LikeHeart active={isLiked} size={18} />
              {comment.like_count > 0 && <span className="text-sm">{comment.like_count}</span>}
            </button>
            <button
              onClick={() =>
                onToggleReaction({ commentId: comment.id, type: "dislike", currentlyActive: isDisliked })
              }
              className={`flex items-center gap-1.5 p-1.5 ${isDisliked ? "text-danger" : "text-ink-muted"}`}
            >
              <ThumbsDown size={18} fill={isDisliked ? "currentColor" : "none"} />
              {comment.dislike_count > 0 && <span className="text-sm">{comment.dislike_count}</span>}
            </button>

            {(["support", "disagree", "pushback"] as Stance[]).map((s) => (
              <button
                key={s}
                onClick={() => setReplyStance(s)}
                className={`text-sm font-medium py-1.5 hover:opacity-70 transition-opacity ${STANCE_COLORS[s].iconClass}`}
              >
                {STANCE_COLORS[s].label}
              </button>
            ))}
          </div>

          {/* Unlocks the next level: tapping reveals this primary
              comment's whole reply thread (secondary + tertiary+) in
              its own Replies panel, instead of always rendering it. */}
          {typeof replyCount === "number" && replyCount > 0 && onOpenReplies && (
            <button
              onClick={onOpenReplies}
              className="flex items-center gap-2 mt-2.5 text-sm font-medium text-accent"
            >
              <span className="w-6 h-px bg-border" aria-hidden="true" />
              {formatCompactCount(replyCount)} {replyCount === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>
      </div>

      {replyStance && (
        <StanceComposer
          postId={postId}
          stance={replyStance}
          parentCommentId={comment.id}
          onClose={() => setReplyStance(null)}
        />
      )}
    </div>
  );
}

export function CommentSheet({
  postId,
  commentCount,
  isOwner = false,
  onClose,
  highlightId,
}: {
  postId: string;
  // Shown in the header next to "Comments". Falls back to counting the
  // loaded tree when omitted.
  commentCount?: number;
  // Restricts the bottom composer to a plain (Support-only) comment,
  // same rule PostCard already applies to its own stance tray.
  isOwner?: boolean;
  onClose: () => void;
  // Set when arriving via a notification link — scrolls to and briefly
  // flashes the target comment, auto-opening its Replies panel first
  // if it isn't a primary comment.
  highlightId?: string | null;
}) {
  const { data: comments, isLoading } = useComments(postId);
  const roots = useMemo(() => comments ?? [], [comments]);

  const [openRootId, setOpenRootId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (autoOpenedRef.current || !highlightId || roots.length === 0) return;
    const root = findRootContaining(roots, highlightId);
    if (root) setOpenRootId(root.id);
    autoOpenedRef.current = true;
  }, [highlightId, roots]);

  function handleBack() {
    if (openRootId) {
      setOpenRootId(null);
      return;
    }
    onClose();
  }

  useBackDismiss(handleBack);
  useScrollLock();

  const allIds = useMemo(() => flattenAllIds(roots), [roots]);
  const { data: reactions } = useMyCommentReactions(postId, allIds);
  const toggleReaction = useToggleCommentReaction(postId);

  const openRoot = openRootId ? findNode(roots, openRootId) : null;
  const flatReplies = useMemo(() => (openRoot ? flattenReplies(openRoot) : []), [openRoot]);

  const totalCount = commentCount ?? roots.reduce((sum, r) => sum + 1 + countDescendants(r), 0);

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
        {/* Dimmed backdrop only — the post above the sheet stays visible
            through it, so the sheet reads as an overlay on the post
            rather than a full takeover. */}
        <div className="absolute inset-0 bg-canvas/50 backdrop-blur-overlay" onClick={onClose} />

        {/* Fixed height (not max-h) so the post reliably peeks through
            above the sheet regardless of comment count. */}
        <div className="relative w-full max-w-xl bg-surface rounded-t-3xl border-t border-border h-[82vh] flex flex-col pb-[env(safe-area-inset-bottom)]">
          <div className="w-10 h-1 rounded-full bg-border mx-auto mt-2.5 mb-1 flex-shrink-0" aria-hidden="true" />

          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-1">
              {openRoot && (
                <button onClick={handleBack} className="p-1 -ml-1 text-ink-muted" aria-label="Back">
                  <ArrowLeft size={20} />
                </button>
              )}
              <h2 className="font-display text-base text-ink">
                {openRoot ? "Replies" : "Comments"}
                {!openRoot && totalCount > 0 && (
                  <span className="text-ink-muted font-normal ml-1.5 text-sm">
                    {formatCompactCount(totalCount)}
                  </span>
                )}
              </h2>
            </div>
            <button onClick={onClose} className="p-1 text-ink-muted" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-2">
            {isLoading ? (
              <p className="text-sm text-ink-muted text-center mt-6">Loading…</p>
            ) : openRoot ? (
              <>
                <CommentRow
                  comment={openRoot}
                  postId={postId}
                  highlightId={highlightId}
                  reactions={reactions}
                  onToggleReaction={toggleReaction.mutate}
                />
                {flatReplies.map(({ comment, depth }) => (
                  <CommentRow
                    key={comment.id}
                    comment={comment}
                    postId={postId}
                    indent={depth > 1}
                    highlightId={highlightId}
                    reactions={reactions}
                    onToggleReaction={toggleReaction.mutate}
                  />
                ))}
              </>
            ) : roots.length === 0 ? (
              <p className="text-sm text-ink-muted text-center mt-6">No responses yet.</p>
            ) : (
              roots.map((root) => (
                <CommentRow
                  key={root.id}
                  comment={root}
                  postId={postId}
                  highlightId={highlightId}
                  reactions={reactions}
                  onToggleReaction={toggleReaction.mutate}
                  replyCount={countDescendants(root)}
                  onOpenReplies={() => setOpenRootId(root.id)}
                />
              ))
            )}

            {toggleReaction.isError && (
              <p className="text-xs text-danger text-center py-2">
                Couldn't save that reaction — check console for details.
              </p>
            )}
          </div>

          {/* Persistent composer entry — "Add a comment" at the primary
              level, "Reply to {name}" inside a Replies panel (attaches
              as a direct reply to the primary comment; deeper nesting
              still happens via each row's own Support/Disagree/Pushback
              buttons above). */}
          <div className="border-t border-border px-4 py-2.5 flex-shrink-0">
            <button
              onClick={() => setShowComposer(true)}
              className="w-full text-left text-sm text-ink-muted bg-canvas border border-border rounded-full px-4 py-2.5 truncate"
            >
              {openRoot ? `Reply to ${openRoot.author.display_name}…` : "Add a comment…"}
            </button>
          </div>
        </div>
      </div>

      {showComposer && (
        <StanceComposer
          postId={postId}
          stance="support"
          stances={isOwner ? ["support"] : undefined}
          parentCommentId={openRoot?.id}
          onClose={() => setShowComposer(false)}
        />
      )}
    </Portal>
  );
}
