// src/components/PostCard.tsx
import { useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Heart,
  ThumbsDown,
  Repeat2,
  Redo2,
  Bookmark,
  Handshake,
  Frown,
  Hand,
  Gift as GiftIcon,
  Globe,
  Pencil,
  Archive,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Avatar } from "./Avatar";
import { TierBadge } from "./TierBadge";
import { RoleTags } from "./RoleTags";
import { FollowButton } from "./FollowButton";
import { ReactionTray, type EngagementAction } from "./ReactionTray";
import { PostMedia } from "./PostMedia";
import { PostContent } from "./PostContent";
import { StanceComposer, STANCE_COLORS } from "./StanceComposer";
import { ReshareSheet } from "./ReshareSheet";
import { RepostEmbed } from "./RepostEmbed";
import { RepostBadge } from "./RepostBadge";
import { ConfirmDialog } from "./ConfirmDialog";
import { useAuth } from "../hooks/useAuth";
import { useIsBookmarked, useToggleBookmark } from "../hooks/useBookmarks";
import { useMyReaction, useToggleReaction } from "../hooks/useReactions";
import { useEngagementOrder, type SecondaryActionKey } from "../hooks/useEngagementOrder";
import {
  useDeletePost,
  useSetPostArchived,
  useHasReshared,
  usePostViewCount,
  canEditPost,
} from "../hooks/usePosts";
import { shortDisplayName } from "../lib/displayName";
import { formatPostTime, formatPostDate, formatCompactCount } from "../lib/formatStats";
import { isPlainReshare, isQuote, type PostWithAuthor, type Stance } from "../types/database";

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const DOUBLE_TAP_WINDOW_MS = 300;

// Internal action definition — one icon size (20) since there's no ⋯ menu.
type ActionDef = {
  key: SecondaryActionKey;
  label: string;
  icon: React.ReactNode;
  count: number | null;
  onAction: () => void;
};

export function PostCard({
  post,
  isOwnerView = false,
  showStats = false,
}: {
  post: PostWithAuthor;
  // Accepted so callers like ProfilePage can flag the viewer as the post's
  // owner (e.g. viewing their own profile while impersonating no one).
  isOwnerView?: boolean;
  // Only PostDetail/ProjectDetail (the "expanded", comments-visible view)
  // pass this — shows the X-style time/date/views line just above the
  // engagement tray. Feed-context cards leave it off.
  showStats?: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeStance, setActiveStance] = useState<Stance | null>(null);
  const [showReshareSheet, setShowReshareSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const lastTapRef = useRef(0);

  // Reshare/quote: reshared_post_id set + empty content = plain reshare
  // (own card, own engagement — attributed to the resharer, with a
  // "Reposted" tag and the original embedded below, same treatment as
  // a quote just without a caption line). Non-empty content = quote
  // (own post, original embedded as a card below the caption).
  //
  // Both render/engage as `post` itself now (never swapped to the
  // original) — the person who reshared owns this card. The original
  // is only ever reached via the embedded RepostEmbed card, which
  // already renders its own "no longer available" state when the
  // source has been deleted/archived, so no special-casing is needed
  // here for that.
  const plainReshare = isPlainReshare(post);
  const quotePost = isQuote(post);
  const original = post.reshared_post;

  // Reposting a plain reshare should target the original post (matching
  // standard retweet-of-a-retweet behavior — no reshare chains). Quotes
  // keep their own content, so resharing a quote targets the quote
  // itself, same as `post` normally would. Computed up here (rather than
  // further down, where it used to live) because leftActions below needs
  // reshareTarget.id to check hasReshared before deciding whether to show
  // the Reshare button at all.
  const originalGone = !original || original.is_deleted || original.is_archived;
  const reshareTarget = plainReshare && !originalGone ? original! : post;

  // Own-post view: several engagement actions don't make sense directed
  // at yourself (resharing, taking a stance on, or gifting your own
  // post), so they're hidden from the tray entirely rather than just
  // disabled.
  const isOwner = isOwnerView || user?.id === post.author.id;
  const HIDDEN_FOR_OWNER: SecondaryActionKey[] = ["disagree", "pushback", "gift", "dislike"];

  const isBookmarkedQuery = useIsBookmarked(post.id);
  const toggleBookmark = useToggleBookmark(post.id);
  const isBookmarked = !!isBookmarkedQuery.data;

  const likeQuery   = useMyReaction(post.id, "post", "like");
  const dislikeQuery = useMyReaction(post.id, "post", "dislike");
  const toggleLike   = useToggleReaction(post.id, "post", "like");
  const toggleDislike = useToggleReaction(post.id, "post", "dislike");
  const toggleShare  = useToggleReaction(post.id, "post", "share");
  const isLiked    = !!likeQuery.data;
  const isDisliked = !!dislikeQuery.data;

  const deletePost = useDeletePost();
  const setArchived = useSetPostArchived();

  const { data: engagementOrder } = useEngagementOrder();

  // Only relevant when Reshare would otherwise show at all (non-owners) —
  // no need to query this for your own posts.
  const hasResharedQuery = useHasReshared(reshareTarget.id, !isOwner);
  const hasReshared = !!hasResharedQuery.data;

  const viewCountQuery = usePostViewCount(post.id, showStats);
  const viewCount = viewCountQuery.data ?? 0;

  function handleContentTap() {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_WINDOW_MS) {
      if (!isLiked) toggleLike.mutate(false);
    }
    lastTapRef.current = now;
  }

  // Already on the post page → scroll to discussion; otherwise navigate there.
  function handleCommentTap() {
    if (location.pathname === `/post/${post.id}`) {
      document.getElementById("discussion")?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/post/${post.id}`);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        return; // user cancelled native share sheet
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
    toggleShare.mutate(false); // still record the share
  }

  function handleStance(stance: Stance) {
    setActiveStance(stance);
  }

  // TODO: replace with GiftPicker modal once that component exists.
  function handleGift() {
    navigate(`/post/${post.id}?gift=1`);
  }

  // Owner actions always operate on this row (the reshare/quote/normal
  // post that belongs to the viewer) — never on a displayed original.
  function handleEdit() {
    navigate(`/post/${post.id}/edit`);
  }

  // Archiving prompts for confirmation (same ConfirmDialog as delete,
  // just non-danger styled); unarchiving is the reversal of that, so it
  // goes straight through with no extra prompt.
  function handleToggleArchive() {
    if (post.is_archived) {
      setArchived.mutate({ postId: post.id, archived: false });
    } else {
      setShowArchiveConfirm(true);
    }
  }

  function handleConfirmArchive() {
    setShowArchiveConfirm(false);
    setArchived.mutate({ postId: post.id, archived: true });
  }

  // Was `window.confirm(...)` — blocking native dialogs like confirm/alert
  // are unreliable (often suppressed or auto-dismissed with no visible
  // prompt) inside the mobile WebView/PWA shell this app runs in, which is
  // almost certainly why delete looked like it "didn't work": the early
  // `return` on a silently-false confirm() meant deletePost.mutate() never
  // even ran. Archive never had a confirm gate, which is why it worked.
  // Routed through the app's own ConfirmDialog instead, same as every
  // other destructive "are you sure?" prompt (chat/message delete).
  function handleDelete() {
    setShowDeleteConfirm(true);
  }

  function handleConfirmDelete() {
    setShowDeleteConfirm(false);
    deletePost.mutate(post.id);
  }

  // ─── Secondary action definitions (all 7, passed to scrollable tray) ──────
  // Stance icons carry STANCE_COLORS.iconClass so they stay in sync with
  // StanceComposer tabs and CommentThread pills.

  const secondaryDefs: Record<SecondaryActionKey, ActionDef> = {
    support: {
      key: "support",
      label: "Support",
      icon: <Handshake size={18} className="text-ink" />,
      count: post.support_count > 0 ? post.support_count : null,
      onAction: () => handleStance("support"),
    },
    disagree: {
      key: "disagree",
      label: "Disagree",
      icon: <Frown size={18} className={STANCE_COLORS.disagree.iconClass} />,
      count: post.disagree_count > 0 ? post.disagree_count : null,
      onAction: () => handleStance("disagree"),
    },
    pushback: {
      key: "pushback",
      label: "Pushback",
      icon: <Hand size={18} className={STANCE_COLORS.pushback.iconClass} />,
      count: post.pushback_count > 0 ? post.pushback_count : null,
      onAction: () => handleStance("pushback"),
    },
    dislike: {
      key: "dislike",
      label: isDisliked ? "Disliked" : "Dislike",
      icon: (
        <ThumbsDown
          size={18}
          fill={isDisliked ? "currentColor" : "none"}
        />
      ),
      count: post.dislike_count > 0 ? post.dislike_count : null,
      onAction: () => toggleDislike.mutate(isDisliked),
    },
    gift: {
      key: "gift",
      label: "Gift",
      icon: <GiftIcon size={18} className="text-ink" />,
      count: post.gift_count > 0 ? post.gift_count : null,
      onAction: handleGift,
    },
    reshare: {
      key: "reshare",
      label: "Reshare",
      icon: <Repeat2 size={18} className="text-ink" />,
      count: post.share_count > 0 ? post.share_count : null,
      onAction: handleReshareTap,
    },
    save: {
      key: "save",
      label: isBookmarked ? "Saved" : "Save",
      icon: (
        <Bookmark
          size={18}
          fill={isBookmarked ? "currentColor" : "none"}
        />
      ),
      count: null,
      onAction: () => toggleBookmark.mutate(isBookmarked),
    },
  };

  // Ranked order from the hook, falling back to the default until loaded.
  // Actions that don't make sense on your own post (see HIDDEN_FOR_OWNER
  // above) are dropped entirely when viewing as the owner. Reshare gets its
  // own exclusion rule below rather than living in HIDDEN_FOR_OWNER, since
  // it's hidden not just for owners but also once you've already reshared
  // this post — the same condition that used to gate it out of leftActions.
  const order: SecondaryActionKey[] = (
    engagementOrder ?? ["support", "reshare", "gift", "save", "disagree", "pushback", "dislike"]
  ).filter((k) => {
    if (isOwner && HIDDEN_FOR_OWNER.includes(k)) return false;
    if (k === "reshare" && (isOwner || hasReshared)) return false;
    return true;
  });

  // Edit eligibility is always about this row (the reshare/quote/normal
  // post belonging to the viewer). A plain reshare has no content of its
  // own, so there's nothing to edit — only Archive/Delete apply to it.
  const canEdit = !plainReshare && canEditPost(post);

  // ─── Left (fixed): Like only. Reshare used to live here too but is now
  // ranked alongside the other secondary actions in the swipable middle
  // group (see `order` above) rather than getting a permanent slot.
  const leftActions: EngagementAction[] = [
    {
      key: "like",
      label: isLiked ? "Liked" : "Like",
      icon: (
        <Heart
          size={18}
          fill={isLiked ? "currentColor" : "none"}
          className="text-danger"
        />
      ),
      count: post.like_count > 0 ? post.like_count : null,
      onClick: () => toggleLike.mutate(isLiked),
    },
  ];

  // ─── Right (fixed): Share only. Save used to live here too but is now
  // ranked by usage in the swipable middle group, same as the other
  // secondary actions.
  const rightActions: EngagementAction[] = [
    {
      key: "share",
      label: "Share",
      icon: <Redo2 size={18} className="text-ink" />,
      count: null,
      onClick: () => void handleShare(),
    },
  ];

  // ─── Middle (swipable, 3 slots visible): ranked secondary actions —
  // including Reshare and Save now — plus own-post management folded in
  // here instead of a separate "…" sheet.
  const middleActions: EngagementAction[] = [
    ...order.map((k): EngagementAction => ({
      key: secondaryDefs[k].key,
      label: secondaryDefs[k].label,
      icon: secondaryDefs[k].icon,
      count: secondaryDefs[k].count,
      onClick: () => secondaryDefs[k].onAction(),
    })),
    ...(isOwner
      ? ([
          ...(canEdit
            ? [
                {
                  key: "edit",
                  label: "Edit",
                  icon: <Pencil size={18} className="text-ink" />,
                  count: null,
                  onClick: handleEdit,
                } satisfies EngagementAction,
              ]
            : []),
          {
            key: "archive",
            label: post.is_archived ? "Unarchive" : "Archive",
            icon: post.is_archived ? (
              <RotateCcw size={18} className="text-ink" />
            ) : (
              <Archive size={18} className="text-ink" />
            ),
            count: null,
            onClick: handleToggleArchive,
          },
          {
            key: "delete",
            label: "Delete",
            icon: <Trash2 size={18} className="text-ink" />,
            count: null,
            onClick: handleDelete,
          },
        ] satisfies EngagementAction[])
      : []),
  ];

  function handleReshareTap() {
    if (plainReshare && originalGone) return; // nothing valid left to reshare
    if (hasReshared) return; // already reshared — button should be hidden, but guard anyway
    setShowReshareSheet(true);
  }

  return (
    <article
      data-owner-view={isOwner}
      className="bg-surface dark:bg-[#121114] rounded-2xl p-4 mb-4 relative shadow-[0_0_0_1px_rgba(var(--shadow-ink-rgb),0.07),0_10px_24px_-6px_rgba(var(--shadow-ink-rgb),0.16)]"
    >
      <div className="flex items-start gap-3">
        <Link to={`/profile/${post.author.username}`}>
          <Avatar src={post.author.avatar_url} name={post.author.display_name} size="md" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={`/profile/${post.author.username}`}
              className="font-display font-semibold text-[17px] leading-5 text-ink hover:underline"
            >
              {shortDisplayName(post.author.display_name)}
            </Link>
            <TierBadge tier={post.author.tier} />
          </div>

          {post.author.roles.length > 0 && (
            <RoleTags
              roles={post.author.roles}
              className="text-[13px] font-normal leading-[18px] text-ink-muted block"
            />
          )}

          <p className="text-xs leading-[18px] text-ink-muted flex items-center gap-1">
            <span>
              {timeAgo(post.created_at)}
              {post.edited_at && " · edited"}
            </span>
            {post.visibility === "public" && <Globe size={11} />}
            {plainReshare && (
              <span className="flex items-center gap-0.5 text-accent">
                <Repeat2 size={11} />
                Reposted
              </span>
            )}
          </p>

          {/* Relationship badge (Follow/Following/Friends/Requested) used to
              sit in a fixed column to the right of the name row, where it
              competed with long display names/role tags for width. Moved
              here instead: a divider — same border-border line used above
              the engagement tray — drawn under the time row, with the badge
              overlaid on its right end, like a labeled divider with the
              label pushed to the end instead of the middle. Frees the name
              row to use the card's full width. bg-surface (+ dark variant,
              matching the card's own background below) lets the badge "cut"
              into the line instead of drawing on top of it. */}
          {!isOwner && (
            <div className="relative mt-2 border-t border-border">
              <span className="absolute right-0 top-1/2 -translate-y-1/2 pl-2 bg-surface dark:bg-[#121114]">
                <FollowButton authorId={post.author.id} isPrivate={post.author.is_private} />
              </span>
            </div>
          )}
        </div>

        {/* Reshare badge only now — the relationship badge moved to overlay
            the divider under the time row (above), so this fixed right-hand
            column no longer competes with the poster's name for width. */}
        {plainReshare && (
          <div className="self-start pt-0.5">
            <RepostBadge source={original} />
          </div>
        )}
      </div>

      {/* Own content — skipped for a plain reshare, which has none of its
          own (just the embedded original below). Always present for a
          quote (the caption) and a normal post. */}
      {(post.content.trim() !== "" || post.heading) && (
        <Link to={`/post/${post.id}`} onClick={handleContentTap} className="block mt-3">
          <PostContent heading={post.heading} content={post.content} />
        </Link>
      )}

      <PostMedia mediaUrls={post.media_urls} />

      {/* Embedded original — for both a plain reshare and a quote. Handles
          its own "no longer available" state internally, and always
          links to the original post with the original creator's own
          details, regardless of whether it's still reachable. */}
      {(plainReshare || quotePost) && <RepostEmbed source={original} />}

      {/* Time · date · views — only on the expanded (comments-visible) post,
          matching X's post-detail formatting. Feed cards don't show this. */}
      {showStats && (
        <div className="flex items-center gap-1.5 text-sm text-ink-muted mt-3 pb-3 border-b border-border">
          <span>{formatPostTime(post.created_at)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatPostDate(post.created_at)}</span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-ink">{formatCompactCount(viewCount)}</span>
          <span>Views</span>
        </div>
      )}

      {/* Like fixed left · ranked secondary (Reshare, Save + more, + owner
          management) swipable in the middle · Share fixed right · Comments
          count under Like */}
      <ReactionTray
        leftActions={leftActions}
        middleActions={middleActions}
        rightActions={rightActions}
        belowLeftLabel={{ text: `Comments: ${post.comment_count}`, onClick: handleCommentTap }}
      />

      {activeStance && (
        <StanceComposer
          postId={post.id}
          stance={activeStance}
          stances={isOwner ? ["support"] : undefined}
          onClose={() => setActiveStance(null)}
        />
      )}

      {showReshareSheet && (
        <ReshareSheet
          postId={reshareTarget.id}
          source={reshareTarget}
          onClose={() => setShowReshareSheet(false)}
        />
      )}

      {showArchiveConfirm && (
        <ConfirmDialog
          title="Archive this post?"
          description="It'll be hidden from your profile and the feed until you unarchive it from your Archive."
          confirmLabel="Archive"
          danger={false}
          onConfirm={handleConfirmArchive}
          onCancel={() => setShowArchiveConfirm(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete this post?"
          description="This can't be undone."
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </article>
  );
}
