import { Link } from "react-router-dom";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { pageModeLabel } from "../lib/pageRoles";
import type { PageSearchResult } from "../hooks/useSearch";

// One page (organisation / brand / product) in a list. Mirrors PersonRow so
// people and pages read as the same kind of result: avatar, name, a single
// muted descriptor line, follower count on the right.
export function PageRow({ page }: { page: PageSearchResult }) {
  return (
    <Link to={`/page/${page.username}`} className="flex items-center gap-3 py-3 min-h-[56px]">
      <Avatar src={page.avatar_url} name={page.name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-ink text-sm truncate">{page.name}</span>
          {page.is_verified && <VerifiedBadge className="shrink-0" />}
        </div>
        <p className="text-xs text-ink-muted mt-0.5 truncate">
          {page.tagline || `${pageModeLabel(page.page_type)} · @${page.username}`}
        </p>
        {page.tagline && (
          <p className="text-xs text-ink-muted/80 truncate">
            {pageModeLabel(page.page_type)} · @{page.username}
          </p>
        )}
      </div>
      {page.follower_count > 0 && (
        <span className="text-xs text-ink-muted shrink-0">
          {page.follower_count.toLocaleString()} followers
        </span>
      )}
    </Link>
  );
}
