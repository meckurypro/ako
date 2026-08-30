import { useState } from "react";
import { Heart, ThumbsDown, Share2, Handshake, XCircle, Gift as GiftIcon } from "lucide-react";
import { useMyReaction, useToggleReaction } from "../hooks/useReactions";
import { StanceComposer } from "./StanceComposer";
import { GiftPicker } from "./GiftPicker";
import type { PostWithAuthor, Stance } from "../types/database";

// Raised hand for Pushback — deliberately not a reply/share-style arrow,
// per the product decision that Pushback needed its own distinct gesture.
function RaisedHandIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11V6a1.5 1.5 0 0 1 3 0v5M12 11V4.5a1.5 1.5 0 0 1 3 0V11M15 11V6.5a1.5 1.5 0 0 1 3 0V13a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L3.5 14.5a1.5 1.5 0 0 1 2.1-2.1L7 13.7V11a1.5 1.5 0 0 1 3 0" />
    </svg>
  );
}

interface ReactionTrayProps {
  post: PostWithAuthor;
}

export function ReactionTray({ post }: ReactionTrayProps) {
  const [openStance, setOpenStance] = useState<Stance | null>(null);
  const [giftPickerOpen, setGiftPickerOpen] = useState(false);

  const likeQuery = useMyReaction(post.id, "post", "like");
  const dislikeQuery = useMyReaction(post.id, "post", "dislike");
  const toggleLike = useToggleReaction(post.id, "post", "like");
  const toggleDislike = useToggleReaction(post.id, "post", "dislike");
  const toggleShare = useToggleReaction(post.id, "post", "share");

  const isLiked = !!likeQuery.data;
  const isDisliked = !!dislikeQuery.data;

  return (
    <div>
      {/* Fixed row — Like, Dislike, Share. Always visible, no scrolling
          required, since these are the low-friction universal reactions. */}
      <div className="flex items-center gap-5 pt-3">
        <button
          onClick={() => toggleLike.mutate(isLiked)}
          className={`flex items-center gap-1.5 text-sm ${isLiked ? "text-accent" : "text-ink-muted"}`}
        >
          <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
          {post.like_count}
        </button>

        <button
          onClick={() => toggleDislike.mutate(isDisliked)}
          className={`flex items-center gap-1.5 text-sm ${isDisliked ? "text-danger" : "text-ink-muted"}`}
        >
          <ThumbsDown size={18} fill={isDisliked ? "currentColor" : "none"} />
          {post.dislike_count}
        </button>

        <button
          onClick={() => toggleShare.mutate(false)}
          className="flex items-center gap-1.5 text-sm text-ink-muted"
        >
          <Share2 size={18} />
          {post.share_count}
        </button>
      </div>

      {/* Scrollable row — Support, Disagree, Pushback, Gift. The
          "swipe to find more" tray from the product spec — on touch
          devices this scrolls naturally; most-used items simply sit
          first in DOM order for now (true per-user reordering is a
          later personalization feature, not V1). */}
      <div className="flex items-center gap-4 mt-2 overflow-x-auto scrollbar-none pb-1">
        <button
          onClick={() => setOpenStance("support")}
          className="flex items-center gap-1.5 text-sm text-ink-muted flex-shrink-0"
        >
          <Handshake size={18} />
          Support {post.support_count > 0 && post.support_count}
        </button>

        <button
          onClick={() => setOpenStance("disagree")}
          className="flex items-center gap-1.5 text-sm text-ink-muted flex-shrink-0"
        >
          <XCircle size={18} />
          Disagree {post.disagree_count > 0 && post.disagree_count}
        </button>

        <button
          onClick={() => setOpenStance("pushback")}
          className="flex items-center gap-1.5 text-sm text-ink-muted flex-shrink-0"
        >
          <RaisedHandIcon />
          Pushback {post.pushback_count > 0 && post.pushback_count}
        </button>

        <button
          onClick={() => setGiftPickerOpen(true)}
          className="flex items-center gap-1.5 text-sm text-ink-muted flex-shrink-0"
        >
          <GiftIcon size={18} />
          {post.gift_count > 0 && post.gift_count}
        </button>
      </div>

      {openStance && (
        <StanceComposer
          postId={post.id}
          stance={openStance}
          onClose={() => setOpenStance(null)}
        />
      )}

      {giftPickerOpen && (
        <GiftPicker
          recipientId={post.author_id}
          postId={post.id}
          onClose={() => setGiftPickerOpen(false)}
        />
      )}
    </div>
  );
}
