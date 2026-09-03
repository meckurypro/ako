// src/components/RepostEmbed.tsx
import { Link } from "react-router-dom";
import { Avatar } from "./Avatar";
import { shortDisplayName } from "../lib/displayName";
import type { RepostSource } from "../types/database";

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
      <div className="mt-3 rounded-xl border border-border bg-canvas px-4 py-3 text-sm text-ink-muted">
        This post is no longer available.
      </div>
    );
  }

  if (source.is_archived) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-canvas px-4 py-3 text-sm text-ink-muted">
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
      className="mt-3 block rounded-xl border border-border bg-canvas px-3.5 py-3 hover:bg-canvas/80 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Avatar src={source.author.avatar_url} name={source.author.display_name} size="sm" />
        <span className="font-display font-semibold text-sm text-ink truncate">
          {shortDisplayName(source.author.display_name)}
        </span>
        <span className="text-xs text-ink-muted shrink-0">{timeAgo(source.created_at)}</span>
      </div>

      {source.heading && (
        <p className="font-display font-semibold text-sm text-ink mt-1.5">{source.heading}</p>
      )}
      {preview && <p className="text-sm text-ink mt-1 whitespace-pre-wrap break-words">{preview}</p>}

      {source.media_urls.length > 0 && (
        <div className="mt-2 w-full h-32 rounded-lg overflow-hidden bg-surface border border-border">
          <img src={source.media_urls[0]} alt="" className="w-full h-full object-cover" />
        </div>
      )}
    </Link>
  );
}
