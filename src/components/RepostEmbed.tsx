// src/components/RepostEmbed.tsx
import { formatHeading } from "../lib/headingCase";
import { Link } from "react-router-dom";
import { Avatar } from "./Avatar";
import { SlideCarousel } from "./PostMedia";
import type { RepostSource } from "../types/database";
import { timeAgo } from "../lib/timeAgo";

// No-op — see the export doc on SlideCarousel. A tap here doesn't need
// to do anything extra: the whole embed is already one big Link to the
// original post, so the browser's own click-through handles navigation.
function ignoreTap() {}

/**
 * The original post, embedded as its own bordered card inside a quote post
 * (or the quote composer preview). Tapping navigates to the original's own
 * page with its own engagement — hitting back returns to the quote, since
 * this is a normal Link/route push, not a replace.
 *
 * `source` is null/undefined when the original can no longer be fetched at
 * all (shouldn't normally happen since the FK just leaves the row in
 * place); is_deleted/is_archived on a fetched row is the expected path for
 * "no longer available".
 */
export function RepostEmbed({ source }: { source: RepostSource | null | undefined }) {
  if (!source || source.is_deleted) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-surface dark:bg-[#121114] px-4 py-3 text-sm text-ink-muted">
        This post is no longer available.
      </div>
    );
  }

  if (source.is_archived) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-surface dark:bg-[#121114] px-4 py-3 text-sm text-ink-muted">
        This post has been archived by its author.
      </div>
    );
  }

  const preview =
    source.content.length > 240 ? `${source.content.slice(0, 240)}…` : source.content;

  return (
    <Link
      to={`/post/${source.id}`}
      onClick={(e) => e.stopPropagation()}
      className="mt-3 block rounded-xl border border-border bg-surface dark:bg-[#121114] px-3.5 py-3 hover:bg-canvas/50 dark:hover:bg-canvas/20 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Avatar src={source.author.avatar_url} name={source.author.display_name} size="sm" />
        <span className="font-display font-semibold text-sm text-ink truncate">
          {`@${source.author.username}`}
        </span>
        <span className="text-xs text-ink-muted shrink-0">{timeAgo(source.created_at)}</span>
      </div>

      {source.heading && (
        <p className="font-display font-semibold text-sm text-ink mt-1.5">{formatHeading(source.heading)}</p>
      )}
      {preview && <p className="text-sm text-ink mt-1 whitespace-pre-wrap break-words">{preview}</p>}

      {source.media_urls.length === 1 && (
        <div className="mt-2 w-full h-32 rounded-lg overflow-hidden bg-surface border border-border">
          <img src={source.media_urls[0]} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Multi-image original — a real swipeable carousel (same one
          PostMedia uses for a native post's own slides), not a static
          first-image thumbnail. The static version had no
          data-swipeable-ignore, so a swipe attempt here fell through
          to the surrounding Feed/Profile tab row's touch handler and
          dragged the whole page to a different tab instead of paging
          images — this is what fixes that. frameClassName keeps the
          embed's existing compact height instead of growing to a full
          post card's aspect-ratio frame.

          Deliberately NOT wrapped in a stopPropagation div the way
          PostMedia's own usage is: this carousel is nested INSIDE the
          embed's own Link (unlike a native post's, which sits beside
          its content Link), so a plain tap should keep bubbling up
          and let that Link navigate — same as tapping the
          single-image thumbnail above already does. A real swipe
          doesn't navigate: SlideCarousel's own handleClick already
          stops the swipe's trailing synthetic click from bubbling
          any further once it swallows it (see PostMedia.tsx), so
          mid-swipe releases land on the next/previous slide instead
          of jumping to the post page. */}
      {source.media_urls.length > 1 && (
        <div className="mt-2">
          <SlideCarousel mediaUrls={source.media_urls} onTap={ignoreTap} frameClassName="h-32" />
        </div>
      )}
    </Link>
  );
}
