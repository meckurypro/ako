// src/components/PostCard.tsx
import { useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  MessageCircle,
  Heart,
  ThumbsDown,
  Share2,
  Bookmark,
  Handshake,
  XCircle,
  Hand,
  Gift as GiftIcon,
  Globe,
} from "lucide-react";
import { Avatar } from "./Avatar";
import { TierBadge } from "./TierBadge";
import { RoleTags } from "./RoleTags";
import { ReactionTray, type EngagementAction } from "./ReactionTray";
import { PostMedia } from "./PostMedia";
import { PostContent } from "./PostContent";
import { StanceComposer, STANCE_COLORS } from "./StanceComposer";
import { useAuth } from "../hooks/useAuth";
import { useIsBookmarked, useToggleBookmark } from "../hooks/useBookmarks";
import { useMyReaction, useToggleReaction } from "../hooks/useReactions";
import { useEngagementOrder, type SecondaryActionKey } from "../hooks/useEngagementOrder";
import { shortDisplayName } from "../lib/displayName";
import type { PostWithAuthor, Stance } from "../types/database";

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

export function PostCard({ post }: { post: PostWithAuthor }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeStance, setActiveStance] = useState<Stance | null>(null);
  const lastTapRef = useRef(0);

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

  // ─── Tray: Like (fixed, slot 1) + all 6 secondary in ranked order ─────────
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
    ...order.map((k): EngagementAction => ({
      key: secondaryDefs[k].key,
      label: secondaryDefs[k].label,
      icon: secondaryDefs[k].icon,
      count: secondaryDefs[k].count,
      onClick: () => secondaryDefs[k].onAction(),
    })),
  ];

  return (
    <article className="bg-surface rounded-2xl p-4 mb-4 relative shadow-[0_0_0_1px_rgba(31,29,26,0.07),0_10px_24px_-6px_rgba(31,29,26,0.16)]">
      <div className="flex items-start gap-3">
        <Link to={`/profile/${post.author.username}`}>
          <Avatar src={post.author.avatar_url} name={post.author.display_name} size="lg" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/profile/${post.author.username}`}
              className="font-display font-bold text-xl leading-6 text-ink hover:underline"
            >
              {shortDisplayName(post.author.display_name)}
            </Link>
            <TierBadge tier={post.author.tier} />
          </div>

          {post.author.roles.length > 0 && (
            <RoleTags
              roles={post.author.roles}
              className="text-[15px] font-normal leading-5 text-ink-muted block"
            />
          )}

          <p className="text-sm leading-5 text-ink-muted flex items-center gap-1">
            <span>
              {timeAgo(post.created_at)}
              {post.edited_at && " · edited"}
            </span>
            {post.visibility === "public" && <Globe size={12} />}
          </p>
        </div>

        {/* ── Comment count + Share — replaces the old ⋯ menu ─────────────── */}
        {/* Owner actions (Edit/Archive/Delete) are orphaned; they need a new
            home (e.g. PostDetail page) — to be addressed separately. */}
        <div className="flex flex-col items-center gap-2.5 self-start pt-0.5">
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

      <Link to={`/post/${post.id}`} onClick={handleContentTap} className="block mt-3">
        <PostContent heading={post.heading} content={post.content} />
      </Link>

      <PostMedia mediaUrls={post.media_urls} />

      {/* 7 actions in a scrollable row: Like · [6 ranked secondary] */}
      <ReactionTray actions={trayActions} />

      {activeStance && (
        <StanceComposer
          postId={post.id}
          stance={activeStance}
          onClose={() => setActiveStance(null)}
        />
      )}
    </article>
  );
}
