// src/components/comments/ThreadContextRow.tsx
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Avatar } from "../Avatar";

/**
 * A compact, neutral row for what sits ABOVE an opened comment — the original post, then each comment on the
 * way down to it. A thin line runs from one avatar to the next so the chain reads as a single conversation.
 * Neutral on purpose: only the replies below the opened comment carry stance colour.
 */
export function ThreadContextRow({
  to,
  name,
  avatarUrl,
  meta,
  children,
}: {
  to: string;
  name: string;
  avatarUrl: string | null;
  /** e.g. "· 3h" */
  meta?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className="flex gap-3 pl-3 pr-1 hover:bg-surface/60 transition-colors">
      <div className="flex flex-col items-center flex-shrink-0 pt-3">
        <Avatar src={avatarUrl} name={name} size="sm" />
        <span className="w-0.5 flex-1 mt-1 bg-border rounded-full" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0 py-3">
        <p className="text-sm text-ink truncate">
          <span className="font-medium">{name}</span>
          {meta && <span className="text-ink-muted"> {meta}</span>}
        </p>
        <div className="text-[15px] leading-snug text-ink-muted mt-0.5 line-clamp-3 break-words">{children}</div>
      </div>
    </Link>
  );
}

/** Same footprint, for an ancestor that was deleted or can't be shown to this viewer. */
export function ThreadContextGap({ label }: { label: string }) {
  return (
    <div className="flex gap-3 pl-3 pr-1">
      <div className="flex flex-col items-center flex-shrink-0 pt-3">
        <span className="w-8 h-8 rounded-full border border-dashed border-border" aria-hidden="true" />
        <span className="w-0.5 flex-1 mt-1 bg-border rounded-full" aria-hidden="true" />
      </div>
      <p className="flex-1 min-w-0 py-4 text-sm text-ink-muted italic">{label}</p>
    </div>
  );
}
