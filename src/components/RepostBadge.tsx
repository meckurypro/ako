// src/components/RepostBadge.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Repeat2 } from "lucide-react";
import type { RepostSource } from "../types/database";

/**
 * Sits in the card's top-right corner on a plain reshare (no caption) —
 * the spot the old ⋯ menu used to occupy on this card. Subtle by design:
 * a repost reads visually identical to the original post it's reposting,
 * this badge is the only tell. Tapping jumps to the original post itself
 * (its own PostCard, own engagement) — with `?view=post` so PostDetail
 * skips auto-opening its comment sheet, since the point of this tap is
 * "show me the original post", not "take me to its comments". The
 * visitor can still open comments, engage, and scroll from there like
 * any other post — see PostDetail's `commentsOpen`. If the original has
 * been deleted/archived since the reshare was made, shows a message
 * instead of navigating.
 */
export function RepostBadge({ source }: { source: RepostSource | null | undefined }) {
  const navigate = useNavigate();
  const [unavailable, setUnavailable] = useState(false);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!source || source.is_deleted || source.is_archived) {
      setUnavailable(true);
      setTimeout(() => setUnavailable(false), 2500);
      return;
    }
    navigate(`/post/${source.id}?view=post`);
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        aria-label="Reshared — view original"
        className="flex flex-col items-center gap-0.5 text-accent"
      >
        <Repeat2 size={18} />
      </button>

      {unavailable && (
        <div className="absolute top-full right-0 mt-1 whitespace-nowrap bg-ink text-canvas text-xs px-3 py-1.5 rounded-lg shadow-lg z-10">
          This post is no longer available
        </div>
      )}
    </div>
  );
}
