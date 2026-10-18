// src/pages/admin/AdminUserList.tsx
//
// Opened by tapping a Users card on Admin → Growth. Shows the people behind that
// number (name + email), one fixed-size page at a time — no scrolling list.
// Filter and page live in the URL (?filter=today&page=2) so back/refresh/share
// all land on the same view.
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import {
  USER_LIST_FILTERS,
  USER_LIST_PAGE_SIZE,
  isUserListFilter,
  useAdminUserList,
} from "../../hooks/useAdminUserList";
import { Avatar } from "../../components/Avatar";
import { Pagination } from "../../components/Pagination";

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_TONE: Record<string, string> = {
  approved: "text-accent",
  pending: "text-ink-muted",
  declined: "text-danger",
  suspended: "text-danger",
};

export function AdminUserList() {
  const smartBack = useSmartBack();
  const [params, setParams] = useSearchParams();

  const rawFilter = params.get("filter");
  const filter = isUserListFilter(rawFilter) ? rawFilter : "all";
  const rawPage = Number.parseInt(params.get("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const { data, isLoading, error, isPlaceholderData } = useAdminUserList(filter, page);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / USER_LIST_PAGE_SIZE));
  const rows = data?.rows ?? [];

  const goTo = (p: number) => {
    const next = new URLSearchParams(params);
    next.set("filter", filter);
    next.set("page", String(p));
    setParams(next, { replace: true });
  };

  // A stale/hand-edited ?page= past the end (e.g. after the list shrank): snap to the last page.
  if (data && total > 0 && page > totalPages) {
    goTo(totalPages);
  }

  const from = total === 0 ? 0 : (page - 1) * USER_LIST_PAGE_SIZE + 1;
  const to = Math.min(page * USER_LIST_PAGE_SIZE, total);

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={smartBack} className="text-ink-muted" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <div className="min-w-0">
            <h2 className="font-display text-xl text-ink leading-tight">{USER_LIST_FILTERS[filter]}</h2>
            <p className="text-xs text-ink-muted">
              {isLoading ? "Loading…" : `${total.toLocaleString()} ${total === 1 ? "user" : "users"}`}
            </p>
          </div>
        </div>

        {!!error && <p className="text-danger text-center py-6 text-sm">Couldn't load users.</p>}

        {!error && !isLoading && rows.length === 0 && (
          <p className="text-ink-muted text-center py-10 text-sm">No users in this group.</p>
        )}

        <ul
          className={`space-y-2 mb-4 transition-opacity ${isPlaceholderData ? "opacity-50 pointer-events-none" : ""}`}
          data-testid="user-rows"
          aria-busy={isPlaceholderData}
        >
          {rows.map((u) => (
            <li key={u.id}>
              <Link
                to={`/profile/${u.username}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface border border-border"
              >
                <Avatar src={u.avatar_url} name={u.display_name} size="md" />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1 text-sm font-medium text-ink">
                    <span className="truncate">{u.display_name}</span>
                    {u.is_verified && <BadgeCheck size={14} className="text-accent flex-shrink-0" />}
                  </span>
                  <span className="block text-xs text-ink-muted truncate">{u.email ?? "No email"}</span>
                  <span className="block text-[11px] text-ink-muted truncate">
                    @{u.username} · Joined {formatJoined(u.created_at)}
                  </span>
                </span>
                <span className={`text-[11px] capitalize flex-shrink-0 ${STATUS_TONE[u.account_status] ?? "text-ink-muted"}`}>
                  {u.account_status}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {total > 0 && (
          <div className="space-y-2">
            <Pagination page={page} totalPages={totalPages} onChange={goTo} />
            <p className="text-center text-xs text-ink-muted">
              Showing {from}–{to} of {total.toLocaleString()} · Page {page} of {totalPages}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
