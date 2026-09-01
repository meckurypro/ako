// src/components/ReactionTray.tsx
import { useState } from "react";
import { Handshake, XCircle, Gift as GiftIcon } from "lucide-react";
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

// Support/Disagree/Pushback are all just comments with a stance
// attached (see StanceComposer/useCreateComment) — there's no
// separate "plain comment" button anymore since these three already
// cover commenting, and a fourth generic option alongside them was
// redundant. Like, Dislike, Share, and Save moved into PostCard's
// kebab menu to cut down how many actions compete for attention in
// the always-visible row.
export function ReactionTray({ post }: ReactionTrayProps) {
  const [openStance, setOpenStance] = useState<Stance | null>(null);
  const [giftPickerOpen, setGiftPickerOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-4 pt-3 overflow-x-auto scrollbar-none pb-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenStance("support");
          }}
          className="flex items-center gap-1.5 text-sm text-ink-muted flex-shrink-0"
        >
          <Handshake size={18} />
          Support {post.support_count > 0 && post.support_count}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenStance("disagree");
          }}
          className="flex items-center gap-1.5 text-sm text-ink-muted flex-shrink-0"
        >
          <XCircle size={18} />
          Disagree {post.disagree_count > 0 && post.disagree_count}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenStance("pushback");
          }}
          className="flex items-center gap-1.5 text-sm text-ink-muted flex-shrink-0"
        >
          <RaisedHandIcon />
          Pushback {post.pushback_count > 0 && post.pushback_count}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setGiftPickerOpen(true);
          }}
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
