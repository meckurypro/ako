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
  // (renders/engages as the original, badge in the corner — same as a
  // retweet: no separate engagement surface for the repost itself).
  // Non-empty content = quote (own post, original embedded as a card
  // below the caption, own engagement).
  const plainReshare = isPlainReshare(post);
  const quotePost = isQuote(post);
  const original = post.reshared_post;
  const originalUnavailable = plainReshare && (!original || original.is_deleted || original.is_archived);

  // What the card actually renders/engages against. `post` itself for
  // quotes and normal posts; the original for a live plain reshare.
  const displayPost = plainReshare && original && !originalUnavailable ? original : post;

  const isBookmarkedQuery = useIsBookmarked(displayPost.id);
  const toggleBookmark = useToggleBookmark(displayPost.id);
  const isBookmarked = !!isBookmarkedQuery.data;

  const likeQuery   = useMyReaction(displayPost.id, "post", "like");
  const dislikeQuery = useMyReaction(displayPost.id, "post", "dislike");
  const toggleLike   = useToggleReaction(displayPost.id, "post", "like");
  const toggleDislike = useToggleReaction(displayPost.id, "post", "dislike");
  const toggleShare  = useToggleReaction(displayPost.id, "post", "share");
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
    if (location.pathname === `/post/${displayPost.id}`) {
      document.getElementById("discussion")?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/post/${displayPost.id}`);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/post/${displayPost.id}`;
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
    navigate(`/post/${displayPost.id}?gift=1`);
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
      count: displayPost.support_count > 0 ? displayPost.support_count : null,
      onAction: () => handleStance("support"),
    },
    disagree: {
      key: "disagree",
      label: "Disagree",
      icon: <XCircle size={20} className={STANCE_COLORS.disagree.iconClass} />,
      count: displayPost.disagree_count > 0 ? displayPost.disagree_count : null,
      onAction: () => handleStance("disagree"),
    },
    pushback: {
      key: "pushback",
      label: "Pushback",
      icon: <Hand size={20} className={STANCE_COLORS.pushback.iconClass} />,
      count: displayPost.pushback_count > 0 ? displayPost.pushback_count : null,
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
      count: displayPost.dislike_count > 0 ? displayPost.dislike_count : null,
      onAction: () => toggleDislike.mutate(isDisliked),
    },
    gift: {
      key: "gift",
      label: "Gift",
      icon: <GiftIcon size={20} />,
      count: displayPost.gift_count > 0 ? displayPost.gift_count : null,
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
      count: displayPost.like_count > 0 ? displayPost.like_count : null,
      onClick: () => toggleLike.mutate(isLiked),
    },
    {
      key: "reshare",
      label: "Reshare",
      icon: <Repeat2 size={20} />,
      count: displayPost.share_count > 0 ? displayPost.share_count : null,
      onClick: () => setShowReshareSheet(true),
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
  // reshare/quote/normal post belonging to the viewer), never the
  // displayed original. A plain reshare has no content of its own, so
  // there's nothing to edit — only Archive/Delete apply to it.
  const isOwner = isOwnerView || user?.id === post.author.id;
  const canEdit = !plainReshare && canEditPost(post);

  return (
    <article
      data-owner-view={isOwner}
      className="bg-surface rounded-2xl p-4 mb-4 relative shadow-[0_0_0_1px_rgba(31,29,26,0.07),0_10px_24px_-6px_rgba(31,29,26,0.16)]"
    >
      <div className="flex items-start gap-3">
        <Link to={`/profile/${displayPost.author.username}`}>
          <Avatar src={displayPost.author.avatar_url} name={displayPost.author.display_name} size="md" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={`/profile/${displayPost.author.username}`}
              className="font-display font-semibold text-[17px] leading-5 text-ink hover:underline"
            >
              {shortDisplayName(displayPost.author.display_name)}
            </Link>
            <TierBadge tier={displayPost.author.tier} />
          </div>

          {displayPost.author.roles.length > 0 && (
            <RoleTags
              roles={displayPost.author.roles}
              className="text-[13px] font-normal leading-[18px] text-ink-muted block"
            />
          )}

          <p className="text-xs leading-[18px] text-ink-muted flex items-center gap-1">
            <span>
              {timeAgo(displayPost.created_at)}
              {displayPost.edited_at && " · edited"}
            </span>
            {displayPost.visibility === "public" && <Globe size={11} />}
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

          {!originalUnavailable && (
            <>
              <button
                onClick={handleCommentTap}
                aria-label="Comments"
                className="flex flex-col items-center gap-0.5 text-ink-muted"
              >
                <MessageCircle size={18} />
                {displayPost.comment_count > 0 && (
                  <span className="text-[11px] font-medium leading-none text-ink">
                    {displayPost.comment_count}
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
            </>
          )}
        </div>
      </div>

      {originalUnavailable ? (
        <p className="mt-3 text-sm text-ink-muted italic">
          This post is no longer available.
        </p>
      ) : (
        <>
          <Link to={`/post/${displayPost.id}`} onClick={handleContentTap} className="block mt-3">
            <PostContent heading={displayPost.heading} content={displayPost.content} />
          </Link>

          <PostMedia mediaUrls={displayPost.media_urls} />

          {quotePost && <RepostEmbed source={original} />}

          {/* 8 actions in a scrollable row: Like · Reshare · [6 ranked secondary] */}
          <ReactionTray actions={trayActions} />
        </>
      )}

      {activeStance && (
        <StanceComposer
          postId={displayPost.id}
          stance={activeStance}
          onClose={() => setActiveStance(null)}
        />
      )}

      {showReshareSheet && !originalUnavailable && (
        <ReshareSheet
          postId={displayPost.id}
          source={displayPost}
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
