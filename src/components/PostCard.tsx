// src/components/PostCard.tsx
import { useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  MessageCircle,
  MoreHorizontal,
  Heart,
  ThumbsDown,
  Share2,
  Bookmark,
  Handshake,
  XCircle,
  Hand,
  Gift as GiftIcon,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
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
import { canEditPost, useDeletePost, useSetPostArchived } from "../hooks/usePosts";
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

// Tray layout: Like (1) · Comment (2) · top-3-secondary (3-5).
// Dislike is never in the tray — it lives permanently in the ⋯ menu.
const TRAY_SECONDARY_SLOTS = 3;

// Internal action definition — trayIcon (size 20) for the ReactionTray,
// menuIcon (size 14) for the ⋯ overflow menu, keeping sizes consistent.
type ActionDef = {
  key: SecondaryActionKey;
  label: string;
  trayIcon: React.ReactNode;
  menuIcon: React.ReactNode;
  count: number | null;
  onAction: () => void;
};

export function PostCard({
  post,
  isOwnerView,
}: {
  post: PostWithAuthor;
  isOwnerView?: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isOwner = isOwnerView ?? user?.id === post.author_id;
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeStance, setActiveStance] = useState<Stance | null>(null);
  const lastTapRef = useRef(0);

  const isBookmarkedQuery = useIsBookmarked(post.id);
  const toggleBookmark = useToggleBookmark(post.id);
  const isBookmarked = !!isBookmarkedQuery.data;

  const likeQuery = useMyReaction(post.id, "post", "like");
  const dislikeQuery = useMyReaction(post.id, "post", "dislike");
  const toggleLike = useToggleReaction(post.id, "post", "like");
  const toggleDislike = useToggleReaction(post.id, "post", "dislike");
  const toggleShare = useToggleReaction(post.id, "post", "share");
  const isLiked = !!likeQuery.data;
  const isDisliked = !!dislikeQuery.data;

  const { data: engagementOrder } = useEngagementOrder();
  const deletePost = useDeletePost();
  const setArchived = useSetPostArchived();
  const editable = isOwner && canEditPost(post);

  function handleContentTap() {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_WINDOW_MS) {
      if (!isLiked) toggleLike.mutate(false);
    }
    lastTapRef.current = now;
  }

  // When already on the post detail page, scroll to the Discussion
  // section. Otherwise navigate there. Allows the same PostCard to
  // serve both feed and detail contexts without an extra prop.
  function handleCommentTap() {
    if (location.pathname === `/post/${post.id}`) {
      document.getElementById("discussion")?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/post/${post.id}`);
    }
  }

  async function handleShare() {
    setMenuOpen(false);
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        return;
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
    toggleShare.mutate(false);
  }

  function handleDelete() {
    setMenuOpen(false);
    if (window.confirm("Delete this post? This can't be undone.")) {
      deletePost.mutate(post.id);
    }
  }

  function handleStance(stance: Stance) {
    setMenuOpen(false);
    setActiveStance(stance);
  }

  // TODO: swap for GiftPicker modal once that component exists.
  function handleGift() {
    setMenuOpen(false);
    navigate(`/post/${post.id}?gift=1`);
  }

  // ─── Secondary action definitions ────────────────────────────────────────
  // Stance icons use STANCE_COLORS.iconClass so their colour matches
  // StanceComposer tabs and CommentThread pills — one source of truth.

  const secondaryDefs: Record<SecondaryActionKey, ActionDef> = {
    support: {
      key: "support",
      label: "Support",
      trayIcon: <Handshake size={20} className={STANCE_COLORS.support.iconClass} />,
      menuIcon: <Handshake size={14} className={STANCE_COLORS.support.iconClass} />,
      count: post.support_count > 0 ? post.support_count : null,
      onAction: () => handleStance("support"),
    },
    disagree: {
      key: "disagree",
      label: "Disagree",
      trayIcon: <XCircle size={20} className={STANCE_COLORS.disagree.iconClass} />,
      menuIcon: <XCircle size={14} className={STANCE_COLORS.disagree.iconClass} />,
      count: post.disagree_count > 0 ? post.disagree_count : null,
      onAction: () => handleStance("disagree"),
    },
    pushback: {
      key: "pushback",
      label: "Pushback",
      trayIcon: <Hand size={20} className={STANCE_COLORS.pushback.iconClass} />,
      menuIcon: <Hand size={14} className={STANCE_COLORS.pushback.iconClass} />,
      count: post.pushback_count > 0 ? post.pushback_count : null,
      onAction: () => handleStance("pushback"),
    },
    share: {
      key: "share",
      label: "Share",
      trayIcon: <Share2 size={20} />,
      menuIcon: <Share2 size={14} />,
      count: post.share_count > 0 ? post.share_count : null,
      onAction: () => { void handleShare(); },
    },
    gift: {
      key: "gift",
      label: "Gift",
      trayIcon: <GiftIcon size={20} />,
      menuIcon: <GiftIcon size={14} />,
      count: post.gift_count > 0 ? post.gift_count : null,
      onAction: handleGift,
    },
    save: {
      key: "save",
      label: isBookmarked ? "Saved" : "Save",
      trayIcon: (
        <Bookmark
          size={20}
          fill={isBookmarked ? "currentColor" : "none"}
          className={isBookmarked ? "text-accent" : ""}
        />
      ),
      menuIcon: (
        <Bookmark
          size={14}
          fill={isBookmarked ? "currentColor" : "none"}
          className={isBookmarked ? "text-accent" : ""}
        />
      ),
      count: null,
      onAction: () => toggleBookmark.mutate(isBookmarked),
    },
  };

  const order: SecondaryActionKey[] = engagementOrder ?? [
    "support",
    "gift",
    "save",
    "disagree",
    "pushback",
    "share",
  ];
  const traySecondaryKeys = order.slice(0, TRAY_SECONDARY_SLOTS);
  const overflowSecondaryKeys = order.slice(TRAY_SECONDARY_SLOTS);

  // ─── Tray: Like · Comment · top-3 secondary ──────────────────────────────

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
      key: "comment",
      label: "Comments",
      icon: <MessageCircle size={20} />,
      count: post.comment_count > 0 ? post.comment_count : null,
      onClick: handleCommentTap,
    },
    ...traySecondaryKeys.map((k): EngagementAction => ({
      key: secondaryDefs[k].key,
      label: secondaryDefs[k].label,
      icon: secondaryDefs[k].trayIcon,
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

        {/* ── ⋯ Overflow menu ─────────────────────────────────────────────── */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="text-ink-muted p-1"
            aria-label="Post options"
          >
            <MoreHorizontal size={18} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute top-full right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg py-1 w-52 z-20">

                {/* Dislike — permanently here, never ranked into the tray */}
                <button
                  onClick={() => {
                    toggleDislike.mutate(isDisliked);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-ink hover:bg-canvas"
                >
                  <span className="flex items-center gap-2">
                    <ThumbsDown
                      size={14}
                      fill={isDisliked ? "currentColor" : "none"}
                      className={isDisliked ? "text-danger" : ""}
                    />
                    {isDisliked ? "Remove dislike" : "Dislike"}
                  </span>
                  {post.dislike_count > 0 && (
                    <span className="text-ink-muted">{post.dislike_count}</span>
                  )}
                </button>

                {/* Bottom 3 secondary — the ones that didn't make the tray.
                    As the user's usage shifts these can migrate in/out. */}
                {overflowSecondaryKeys.map((k) => {
                  const def = secondaryDefs[k];
                  return (
                    <button
                      key={def.key}
                      onClick={def.onAction}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-ink hover:bg-canvas"
                    >
                      <span className="flex items-center gap-2">
                        {def.menuIcon}
                        {def.label}
                      </span>
                      {def.count !== null && (
                        <span className="text-ink-muted">{def.count}</span>
                      )}
                    </button>
                  );
                })}

                {/* Owner-only tools */}
                {isOwner && (
                  <>
                    <div className="h-px bg-border my-1" />
                    {editable && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          navigate(`/post/${post.id}/edit`);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-canvas"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setArchived.mutate({ postId: post.id, archived: !post.is_archived });
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-canvas"
                    >
                      {post.is_archived ? <RotateCcw size={14} /> : <Archive size={14} />}
                      {post.is_archived ? "Restore" : "Archive"}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-danger hover:bg-canvas"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Link to={`/post/${post.id}`} onClick={handleContentTap} className="block mt-3">
        <PostContent heading={post.heading} content={post.content} />
      </Link>

      <PostMedia mediaUrls={post.media_urls} />

      {/* 5 slots: Like · Comment · [user's top 3 of 6 secondary] */}
      <ReactionTray actions={trayActions} />

      {/* StanceComposer is a fixed overlay — safe inside a feed list
          since only one card can have activeStance set at a time. */}
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
