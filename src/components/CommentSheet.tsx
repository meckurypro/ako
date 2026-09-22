// src/components/CommentSheet.tsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Flag, Gift as GiftIcon, Loader2, MoreHorizontal, Share2, ThumbsDown, X } from "lucide-react";
import { Avatar } from "./Avatar";
import { LikeHeart } from "./LikeHeart";
import { Portal } from "./Portal";
import { Modal } from "./Modal";
import { DropdownMenu, type DropdownMenuItem } from "./DropdownMenu";
import { GiftPicker } from "./GiftPicker";
import { StanceComposer, STANCE_COLORS } from "./StanceComposer";
import { useToast } from "./Toast";
import { useAuth } from "../hooks/useAuth";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import {
  useRootComments,
  useCommentReplies,
  useCommentAncestors,
  type CommentWithAuthor,
} from "../hooks/useComments";
import {
  useMyCommentReactions,
  useToggleCommentReaction,
  type CommentReactionState,
} from "../hooks/useReactions";
import { useReportReasons, useSubmitReport } from "../hooks/useReports";
import { formatCompactCount } from "../lib/formatStats";
import { renderFormattedText } from "../lib/formatText";
import type { Stance } from "../types/database";
import { useProbationalLock } from "../hooks/useProbationalAccess";

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

type ToggleReaction = (input: {
  commentId: string;
  type: "like" | "dislike";
  currentlyActive: boolean;
}) => void;

// Everything a CommentThread node (at any depth) needs but shouldn't
// have to receive as its own prop, threaded through render calls —
// shared state that lives once at the CommentSheet level instead.
interface CommentSheetCtx {
  postId: string;
  currentUserId: string | null;
  highlightId: string | null | undefined;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  reactions: Map<string, CommentReactionState> | undefined;
  onToggleReaction: ToggleReaction;
  onIdsLoaded: (ids: string[]) => void;
  onShare: (comment: CommentWithAuthor) => void;
  onReport: (comment: CommentWithAuthor) => void;
  onGift: (comment: CommentWithAuthor) => void;
}
const Ctx = createContext<CommentSheetCtx | null>(null);

/**
 * One comment, at any depth — renders itself, then (if its thread is
 * expanded) recurses into its own IMMEDIATE replies, each rendered as
 * another CommentThread one level deeper. This is what replaces the
 * old "tap a comment's replies and the whole sheet jumps to a second,
 * comment-specific screen" behaviour: expanding a thread here inserts
 * it inline, right under that specific comment, while every sibling
 * comment (and the rest of the thread above/below it) stays exactly
 * where it was and stays scrollable. Multiple threads — at any depth,
 * under different parents — can be open at once, each independently
 * collapsible.
 *
 * Matches how Instagram/YouTube actually read once expanded (a flat
 * reply list under the comment that started the thread) without
 * inheriting their "fetch everything up front" cost: each level's
 * replies are only fetched once THAT level is opened (useCommentReplies
 * below is disabled until then), so a long-buried sub-thread nobody
 * ever opens is never pulled over the wire at all.
 */
function CommentThread({ comment, depth }: { comment: CommentWithAuthor; depth: number }) {
  const ctx = useContext(Ctx)!;
  const [replyStance, setReplyStance] = useState<Stance | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  // Probational users don't get the social layer — see
  // useProbationalAccess.ts. Hides the like/dislike row and the
  // support/disagree/pushback reply triggers entirely; viewing
  // comments and their counts is unaffected.
  const reactLocked = useProbationalLock("probational_react_enabled");
  const commentLocked = useProbationalLock("probational_comment_enabled");

  const isExpanded = ctx.expandedIds.has(comment.id);
  const { data: replies, isLoading: repliesLoading } = useCommentReplies(ctx.postId, comment.id, isExpanded);

  // Feed newly-loaded reply ids up so the sheet's reaction batch query
  // (see useMyCommentReactions) covers them too — see onIdsLoaded.
  useEffect(() => {
    if (replies && replies.length > 0) ctx.onIdsLoaded(replies.map((r) => r.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replies]);

  const stanceColors = comment.stance ? STANCE_COLORS[comment.stance] : null;
  const isTarget = !!ctx.highlightId && comment.id === ctx.highlightId;
  const [flashing, setFlashing] = useState(isTarget);

  const reactionState = ctx.reactions?.get(comment.id);
  const isLiked = !!reactionState?.liked;
  const isDisliked = !!reactionState?.disliked;
  const isMine = !!ctx.currentUserId && comment.author.id === ctx.currentUserId;

  useEffect(() => {
    if (!isTarget || !rowRef.current) return;
    rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashing(true);
    const timeout = setTimeout(() => setFlashing(false), 2500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTarget]);

  const menuItems: DropdownMenuItem[] = [
    { key: "share", label: "Share", icon: <Share2 />, onSelect: () => ctx.onShare(comment) },
    ...(isMine
      ? []
      : [
          { key: "gift", label: "Send a gift", icon: <GiftIcon />, onSelect: () => ctx.onGift(comment) },
          { key: "report", label: "Report", icon: <Flag />, variant: "danger" as const, onSelect: () => ctx.onReport(comment) },
        ]),
  ];

  return (
    <div
      id={`comment-${comment.id}`}
      ref={rowRef}
      className={`${depth > 0 ? "ml-5 border-l border-border pl-3" : ""} mt-4 rounded-lg transition-colors duration-700 ${
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

            <div className="relative ml-auto">
              <button
                ref={moreButtonRef}
                onClick={() => setMenuOpen((v) => !v)}
                className="p-1 -mr-1 text-ink-muted"
                aria-label="Comment options"
              >
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <DropdownMenu anchorRef={moreButtonRef} onClose={() => setMenuOpen(false)} items={menuItems} widthClass="w-44" />
              )}
            </div>
          </div>

          <p className="text-sm text-ink mt-1 whitespace-pre-wrap break-words">
            {renderFormattedText(comment.content, "c")}
          </p>

          <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 mt-2.5">
            {!reactLocked && (
              <>
                <button
                  onClick={() =>
                    ctx.onToggleReaction({ commentId: comment.id, type: "like", currentlyActive: isLiked })
                  }
                  className="flex items-center gap-1.5 text-danger -ml-1.5 p-1.5"
                >
                  <LikeHeart active={isLiked} size={18} />
                  {comment.like_count > 0 && <span className="text-sm">{comment.like_count}</span>}
                </button>
                <button
                  onClick={() =>
                    ctx.onToggleReaction({ commentId: comment.id, type: "dislike", currentlyActive: isDisliked })
                  }
                  className={`flex items-center gap-1.5 p-1.5 ${isDisliked ? "text-danger" : "text-ink-muted"}`}
                >
                  <ThumbsDown size={18} fill={isDisliked ? "currentColor" : "none"} />
                  {comment.dislike_count > 0 && <span className="text-sm">{comment.dislike_count}</span>}
                </button>
              </>
            )}

            {!commentLocked &&
              (["support", "disagree", "pushback"] as Stance[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setReplyStance(s)}
                  className={`text-sm font-medium py-1.5 hover:opacity-70 transition-opacity ${STANCE_COLORS[s].iconClass}`}
                >
                  {STANCE_COLORS[s].label}
                </button>
              ))}
          </div>

          {/* Comment-specific: opens/closes only THIS comment's own
              reply list, inline, right here — every other comment's
              thread (sibling or ancestor) is completely unaffected. */}
          {comment.reply_count > 0 && (
            <button
              onClick={() => ctx.toggleExpand(comment.id)}
              className="flex items-center gap-2 mt-2.5 text-sm font-medium text-accent"
            >
              <span className="w-6 h-px bg-border" aria-hidden="true" />
              {isExpanded
                ? "Hide replies"
                : `${formatCompactCount(comment.reply_count)} ${comment.reply_count === 1 ? "reply" : "replies"}`}
            </button>
          )}

          {isExpanded && (
            <div>
              {repliesLoading ? (
                <p className="text-xs text-ink-muted mt-2.5">Loading replies…</p>
              ) : (
                (replies ?? []).map((reply) => (
                  <CommentThread key={reply.id} comment={reply} depth={depth + 1} />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {replyStance && (
        <StanceComposer
          postId={ctx.postId}
          stance={replyStance}
          parentCommentId={comment.id}
          onClose={() => setReplyStance(null)}
        />
      )}
    </div>
  );
}

function CommentReportSheet({ comment, onClose }: { comment: CommentWithAuthor; onClose: () => void }) {
  const toast = useToast();
  const { data: reasons, isLoading: reasonsLoading } = useReportReasons();
  const submitReport = useSubmitReport();
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [details, setDetails] = useState("");

  async function handleSubmit() {
    if (!reasonId) return;
    try {
      await submitReport.mutateAsync({
        targetType: "comment",
        targetId: comment.id,
        reasonId,
        details,
      });
      toast("Report submitted. Thanks for flagging this.", { variant: "success" });
      onClose();
    } catch {
      toast("Couldn't submit your report. Try again.", { variant: "error" });
    }
  }

  return (
    <Modal onClose={onClose} ariaLabel="Report comment" maxWidthClass="max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <Flag size={18} className="text-danger" />
        <h2 className="font-display text-lg text-ink">Report comment</h2>
      </div>

      <p className="text-sm text-ink-muted mb-3 line-clamp-2">
        Reporting {comment.author.display_name}'s comment: "{comment.content}"
      </p>

      {reasonsLoading && <p className="text-ink-muted text-sm py-4 text-center">Loading reasons…</p>}

      <div className="space-y-1.5 mb-3">
        {reasons?.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setReasonId(r.id)}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl border ${
              reasonId === r.id ? "border-accent bg-accent-soft" : "border-border bg-canvas"
            }`}
          >
            <p className="text-sm font-medium text-ink">{r.label}</p>
            {r.description && <p className="text-xs text-ink-muted mt-0.5">{r.description}</p>}
          </button>
        ))}
      </div>

      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Add details (optional, required for 'Other')"
        rows={3}
        className="w-full bg-canvas border border-border rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted resize-none mb-3"
      />

      <button
        type="button"
        disabled={!reasonId || submitReport.isPending}
        onClick={() => void handleSubmit()}
        className="w-full flex items-center justify-center gap-2 bg-danger text-canvas rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {submitReport.isPending && <Loader2 size={16} className="animate-spin" />}
        Submit report
      </button>
    </Modal>
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
  // loaded root comments (an undercount whenever any of them have
  // replies) when omitted — every real caller passes post.comment_count.
  commentCount?: number;
  // Restricts the bottom composer to a plain (Support-only) comment,
  // same rule PostCard already applies to its own stance tray.
  isOwner?: boolean;
  onClose: () => void;
  // Set when arriving via a notification link — scrolls to and briefly
  // flashes the target comment, auto-expanding whichever nested
  // threads sit between it and the top level first.
  highlightId?: string | null;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const { data: roots, isLoading } = useRootComments(postId);
  const rootList = useMemo(() => roots ?? [], [roots]);
  // Probational users don't get the social layer — see
  // useProbationalAccess.ts. Viewing comments is unaffected; only
  // the ability to add a new one is hidden.
  const commentLocked = useProbationalLock("probational_comment_enabled");

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showComposer, setShowComposer] = useState(false);
  const [reportTarget, setReportTarget] = useState<CommentWithAuthor | null>(null);
  const [giftTarget, setGiftTarget] = useState<CommentWithAuthor | null>(null);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Auto-expand every level between the top and a deep-linked reply,
  // so it renders (and can scroll/flash) without the visitor having to
  // manually open each ancestor thread themselves.
  const { data: ancestorIds } = useCommentAncestors(highlightId);
  useEffect(() => {
    if (!ancestorIds || ancestorIds.length === 0) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of ancestorIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [ancestorIds]);

  useBackDismiss(onClose);
  useScrollLock();

  // Grows monotonically as roots load and threads get expanded — the
  // running set of comment ids currently visible somewhere in the
  // sheet, so the reactions batch (below) covers exactly what's on
  // screen without ever having to know the whole tree up front.
  const knownIdsRef = useRef<Set<string>>(new Set());
  const [knownIds, setKnownIds] = useState<string[]>([]);
  function registerIds(ids: string[]) {
    let changed = false;
    for (const id of ids) {
      if (!knownIdsRef.current.has(id)) {
        knownIdsRef.current.add(id);
        changed = true;
      }
    }
    if (changed) setKnownIds(Array.from(knownIdsRef.current));
  }
  useEffect(() => {
    if (rootList.length > 0) registerIds(rootList.map((r) => r.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootList]);

  const { data: reactions } = useMyCommentReactions(postId, knownIds);
  const toggleReaction = useToggleCommentReaction(postId, knownIds.length);

  const totalCount = commentCount ?? rootList.length;

  async function handleShare(comment: CommentWithAuthor) {
    const url = `${window.location.origin}/post/${postId}#comment-${comment.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "A comment on Akọ", url });
      } catch {
        // Native share sheet dismissed — nothing to do.
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast("Link copied.", { variant: "success" });
    }
  }

  const ctx: CommentSheetCtx = {
    postId,
    currentUserId: user?.id ?? null,
    highlightId,
    expandedIds,
    toggleExpand,
    reactions,
    onToggleReaction: toggleReaction.mutate,
    onIdsLoaded: registerIds,
    onShare: (c) => void handleShare(c),
    onReport: setReportTarget,
    onGift: setGiftTarget,
  };

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
            <h2 className="font-display text-base text-ink">
              Comments
              {totalCount > 0 && (
                <span className="text-ink-muted font-normal ml-1.5 text-sm">{formatCompactCount(totalCount)}</span>
              )}
            </h2>
            <button onClick={onClose} className="p-1 text-ink-muted" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          {/* Single scrollable list, always — top-level comments never
              get replaced by a nested view. Expanding any comment's
              replies (at any depth) just inserts them inline right
              under that comment, so every sibling thread and the rest
              of the list stays put and stays scrollable. */}
          <div className="flex-1 overflow-y-auto px-4 pb-2">
            <Ctx.Provider value={ctx}>
              {isLoading ? (
                <p className="text-sm text-ink-muted text-center mt-6">Loading…</p>
              ) : rootList.length === 0 ? (
                <p className="text-sm text-ink-muted text-center mt-6">No responses yet.</p>
              ) : (
                rootList.map((root) => <CommentThread key={root.id} comment={root} depth={0} />)
              )}
            </Ctx.Provider>

            {toggleReaction.isError && (
              <p className="text-xs text-danger text-center py-2">
                Couldn't save that reaction — check console for details.
              </p>
            )}
          </div>

          {/* Always posts a new top-level comment — replying to a
              specific comment (at any depth) happens inline via that
              comment's own Support/Disagree/Pushback buttons above. */}
          {!commentLocked && (
            <div className="border-t border-border px-4 py-2.5 flex-shrink-0">
              <button
                onClick={() => setShowComposer(true)}
                className="w-full text-left text-sm text-ink-muted bg-canvas border border-border rounded-full px-4 py-2.5 truncate"
              >
                Add a comment…
              </button>
            </div>
          )}
        </div>
      </div>

      {showComposer && (
        <StanceComposer
          postId={postId}
          stance="support"
          stances={isOwner ? ["support"] : undefined}
          onClose={() => setShowComposer(false)}
        />
      )}

      {reportTarget && <CommentReportSheet comment={reportTarget} onClose={() => setReportTarget(null)} />}

      {giftTarget && (
        <GiftPicker
          recipientId={giftTarget.author.id}
          recipientName={giftTarget.author.display_name}
          recipientAvatar={giftTarget.author.avatar_url}
          postId={postId}
          commentId={giftTarget.id}
          onClose={() => setGiftTarget(null)}
        />
      )}
    </Portal>
  );
}
