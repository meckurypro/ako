// src/components/PostCard.tsx
import { useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  MessageCircle,
  Heart,
  ThumbsDown,
  Repeat2,
  Share2,
  Bookmark,
  Handshake,
  XCircle,
  Hand,
  Gift as GiftIcon,
  Globe,
  MoreHorizontal,
} from "lucide-react";
import { Avatar } from "./Avatar";
import { TierBadge } from "./TierBadge";
import { RoleTags } from "./RoleTags";
import { ReactionTray, type EngagementAction } from "./ReactionTray";
import { PostMedia } from "./PostMedia";
import { PostContent } from "./PostContent";
import { StanceComposer, STANCE_COLORS } from "./StanceComposer";
import { ReshareSheet } from "./ReshareSheet";
import { RepostEmbed } from "./RepostEmbed";
import { RepostBadge } from "./RepostBadge";
import { PostActionSheet } from "./PostActionSheet";
import { useAuth } from "../hooks/useAuth";
import { useIsBookmarked, useToggleBookmark } from "../hooks/useBookmarks";
import { useMyReaction, useToggleReaction } from "../hooks/useReactions";
import { useEngagementOrder, type SecondaryActionKey } from "../hooks/useEngagementOrder";
import { useDeletePost, useSetPostArchived, canEditPost } from "../hooks/usePosts";
import { shortDisplayName } from "../lib/displayName";
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
}: {
  post: PostWithAuthor;
  // Accepted so callers like ProfilePage can flag the viewer as the post's
  // owner (e.g. viewing their own profile while impersonating no one).
  isOwnerView?: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeStance, setActiveStance] = useState<Stance | null>(null);
  const [showReshareSheet, setShowReshareSheet] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
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

  function handleToggleArchive() {
    setArchived.mutate({ postId: post.id, archived: !post.is_archived });
  }

  function handleDelete() {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    deletePost.mutate(post.id);
  }

  // ─── Secondary action definitions (all 6, passed to scrollable tray) ──────
  // Stance icons carry STANCE_COLORS.iconClass so they stay in sync with
  // StanceComposer tabs and CommentThread pills.

  const secondaryDefs: Record<SecondaryActionKey, ActionDef> = {
    support: {
      key: "support",
      label: "Support",
      icon: <Handshake size={20} className={STANCE_COLORS.support.iconClass} />,
      count: post.support_count > 0 ? post.support_count : null,
      onAction: () => handleStance("support"),
    },
    disagree: {
      key: "disagree",
      label: "Disagree",
      icon: <XCircle size={20} className={STANCE_COLORS.disagree.iconClass} />,
      count: post.disagree_count > 0 ? post.disagree_count : null,
      onAction: () => handleStance("disagree"),
    },
    pushback: {
      key: "pushback",
      label: "Pushback",
      icon: <Hand size={20} className={STANCE_COLORS.pushback.iconClass} />,
      count: post.pushback_count > 0 ? post.pushback_count : null,
      onAction: () => handleStance("pushback"),
    },
    dislike: {
      key: "dislike",
      label: isDisliked ? "Disliked" : "Dislike",
      icon: (
        <ThumbsDown
          size={20}
          fill={isDisliked ? "currentColor" : "none"}
          className={isDisliked ? "text-danger" : ""}
        />
      ),
      count: post.dislike_count > 0 ? post.dislike_count : null,
      onAction: () => toggleDislike.mutate(isDisliked),
    },
    gift: {
      key: "gift",
      label: "Gift",
      icon: <GiftIcon size={20} />,
      count: post.gift_count > 0 ? post.gift_count : null,
      onAction: handleGift,
    },
    save: {
      key: "save",
      label: isBookmarked ? "Saved" : "Save",
      icon: (
        <Bookmark
          size={20}
          fill={isBookmarked ? "currentColor" : "none"}
          className={isBookmarked ? "text-accent" : ""}
        />
      ),
      count: null,
      onAction: () => toggleBookmark.mutate(isBookmarked),
    },
  };

  // Ranked order from the hook, falling back to the default until loaded.
  const order: SecondaryActionKey[] = engagementOrder ?? [
    "support",
    "gift",
    "save",
    "disagree",
    "pushback",
    "dislike",
  ];

  // ─── Tray: Like (fixed) + Reshare (fixed) + all 6 secondary in ranked order ─
  // ReactionTray scrolls horizontally — no slicing needed here. The CSS
  // item width determines how many are visible vs off-screen.

  const trayActions: EngagementAction[] = [
    {
      key: "like",
      label: isLiked ? "Liked" : "Like",
      icon: (
        <Heart
          size={20}
          fill={isLiked ? "currentColor" : "none"}
          className={isLiked ? "text-accent" : ""}
        />
      ),
      count: post.like_count > 0 ? post.like_count : null,
      onClick: () => toggleLike.mutate(isLiked),
    },
    {
      key: "reshare",
      label: "Reshare",
      icon: <Repeat2 size={20} />,
      count: post.share_count > 0 ? post.share_count : null,
      onClick: handleReshareTap,
    },
    ...order.map((k): EngagementAction => ({
      key: secondaryDefs[k].key,
      label: secondaryDefs[k].label,
      icon: secondaryDefs[k].icon,
      count: secondaryDefs[k].count,
      onClick: () => secondaryDefs[k].onAction(),
    })),
  ];

  // Owner-ness and edit eligibility are always about this row (the
  // reshare/quote/normal post belonging to the viewer). A plain reshare
  // has no content of its own, so there's nothing to edit — only
  // Archive/Delete apply to it.
  const isOwner = isOwnerView || user?.id === post.author.id;
  const canEdit = !plainReshare && canEditPost(post);

  // Reposting a plain reshare should target the original post (matching
  // standard retweet-of-a-retweet behavior — no reshare chains). Quotes
  // keep their own content, so resharing a quote targets the quote
  // itself, same as `post` normally would.
  const originalGone = !original || original.is_deleted || original.is_archived;
  const reshareTarget = plainReshare && !originalGone ? original! : post;

  function handleReshareTap() {
    if (plainReshare && originalGone) return; // nothing valid left to reshare
    setShowReshareSheet(true);
  }

  return (
    <article
      data-owner-view={isOwner}
      className="bg-surface rounded-2xl p-4 mb-4 relative shadow-[0_0_0_1px_rgba(var(--shadow-ink-rgb),0.07),0_10px_24px_-6px_rgba(var(--shadow-ink-rgb),0.16)]"
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
        </div>

        {/* ── Comment count + Share (+ reshare badge / owner menu) ─────────── */}
        <div className="flex flex-col items-center gap-2.5 self-start pt-0.5">
          {plainReshare && <RepostBadge source={original} />}

          {isOwner && (
            <button
              onClick={() => setShowActionSheet(true)}
              aria-label="Post options"
              className="text-ink-muted"
            >
              <MoreHorizontal size={18} />
            </button>
          )}

          <button
            onClick={handleCommentTap}
            aria-label="Comments"
            className="flex flex-col items-center gap-0.5 text-ink-muted"
          >
            <MessageCircle size={18} />
            {post.comment_count > 0 && (
              <span className="text-[11px] font-medium leading-none text-ink">
                {post.comment_count}
              </span>
            )}
          </button>

          <button
            onClick={() => void handleShare()}
            aria-label="Share"
            className="text-ink-muted"
          >
            <Share2 size={18} />
          </button>
        </div>
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

      {/* 8 actions in a scrollable row: Like · Reshare · [6 ranked secondary] */}
      <ReactionTray actions={trayActions} />

      {activeStance && (
        <StanceComposer
          postId={post.id}
          stance={activeStance}
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

      {showActionSheet && (
        <PostActionSheet
          canEdit={canEdit}
          isArchived={post.is_archived}
          onEdit={handleEdit}
          onToggleArchive={handleToggleArchive}
          onDelete={handleDelete}
          onClose={() => setShowActionSheet(false)}
        />
      )}
    </article>
  );
}
