import { Link } from "react-router-dom";
import { ArrowUpLeft, Hash, Search, Tag } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useSearchPages, useSearchPeople, useSearchProjects } from "../../hooks/useSearch";
import { useHashtagSuggestions } from "../../hooks/useDiscoverSearch";
import { useTagSearch, type TagRef } from "../../hooks/useTags";
import { PROJECT_TYPE_LABELS } from "../../hooks/useProjects";
import { recordSearchVisit } from "../../lib/searchVisits";
import { splitMatch } from "../../lib/highlightMatch";
import { Avatar } from "../Avatar";
import { VerifiedBadge } from "../VerifiedBadge";
import type { SearchScope } from "../SearchResults";

// The live list under the search bar while you type — TikTok's "keep typing,
// we'll finish it for you" moment. Top row is always what you've typed (tap =
// search it). Below: matching hashtags, accounts you can open straight away,
// and project titles that complete your text. Everything comes from the same
// hooks the results use, so submitting a suggestion's text is an instant
// cache hit, not a second round-trip.

const MAX_TAGS = 2;
const MAX_TOPICS = 2;
const MAX_ACCOUNTS = 3;
const MAX_PROJECTS = 3;

function Highlighted({ text, query }: { text: string; query: string }) {
  const parts = splitMatch(text, query);
  if (!parts) return <span className="font-medium">{text}</span>;
  return (
    <>
      <span className="font-medium">{parts.before}</span>
      <span>{parts.match}</span>
      <span className="font-medium">{parts.after}</span>
    </>
  );
}

function Skeleton() {
  return (
    <div className="space-y-1 pt-1" aria-hidden="true">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-3 min-h-[48px] animate-pulse">
          <div className="w-8 h-8 rounded-full bg-surface shrink-0" />
          <div className="h-3 w-1/2 rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}

export function SearchSuggestions({
  query,
  typed,
  scope,
  onSubmit,
  onFill,
  onPickTag,
}: {
  /** Debounced, trimmed text — drives the lookups. */
  query: string;
  /** What's in the bar right now — shown instantly as the top row. */
  typed: string;
  scope: SearchScope;
  /** Run a search for this text. */
  onSubmit: (term: string) => void;
  /** Put this text in the bar without searching (the ↖ arrow). */
  onFill: (term: string) => void;
  /** Use this topic as a filter for the page's contents (instead of searching its name as text). */
  onPickTag?: (tag: TagRef) => void;
}) {
  const { user } = useAuth();
  const withPeopleAndTags = scope === "all";

  const tags = useHashtagSuggestions(query, withPeopleAndTags);
  const topics = useTagSearch(onPickTag ? query.replace(/^#/, "") : "");
  const people = useSearchPeople(withPeopleAndTags ? query : "");
  const pages = useSearchPages(query);
  const projects = useSearchProjects(query);

  const tagRows = (tags.data ?? []).slice(0, MAX_TAGS);
  const topicRows = onPickTag ? (topics.data ?? []).slice(0, MAX_TOPICS) : [];
  const personRows = withPeopleAndTags ? (people.data ?? []).slice(0, 2) : [];
  const pageRows = (pages.data ?? []).slice(0, MAX_ACCOUNTS - personRows.length);
  const projectRows = (projects.data ?? []).slice(0, MAX_PROJECTS);

  const hasRows = topicRows.length + tagRows.length + personRows.length + pageRows.length + projectRows.length > 0;
  const loading = tags.isLoading || people.isLoading || pages.isLoading || projects.isLoading;

  return (
    <div className="animate-ako-fade-up pt-1">
      {/* What you typed — always first, always one tap from results. */}
      <button onClick={() => onSubmit(typed)} className="w-full flex items-center gap-3 py-3 min-h-[48px] text-left">
        <Search size={16} className="shrink-0 text-ink-muted" />
        <span className="flex-1 min-w-0 truncate text-sm text-ink">{typed.trim()}</span>
      </button>

      {topicRows.map((t) => (
        <button key={t.id} onClick={() => onPickTag?.(t)} className="w-full flex items-center gap-3 py-2 min-h-[48px] text-left">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-surface text-accent shrink-0">
            <Tag size={15} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block truncate text-sm text-ink">
              <Highlighted text={t.name} query={query.replace(/^#/, "")} />
            </span>
            <span className="block text-xs text-ink-muted">Topic · filter by this</span>
          </span>
        </button>
      ))}

      {tagRows.map((h) => (
        <Link
          key={h.id}
          to={`/hashtag/${encodeURIComponent(h.tag)}`}
          className="flex items-center gap-3 py-2 min-h-[48px]"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-surface text-ink-muted shrink-0">
            <Hash size={15} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block truncate text-sm text-ink">
              #<Highlighted text={h.tag} query={query.replace(/^#/, "")} />
            </span>
            <span className="block text-xs text-ink-muted">
              {h.usage_count.toLocaleString()} {h.usage_count === 1 ? "post" : "posts"}
            </span>
          </span>
        </Link>
      ))}

      {personRows.map((p) => (
        <Link
          key={p.id}
          to={`/profile/${p.username}`}
          onClick={() => recordSearchVisit(user?.id, p.id)}
          className="flex items-center gap-3 py-2 min-h-[48px]"
        >
          <Avatar src={p.avatar_url} name={p.display_name} size="sm" />
          <span className="flex-1 min-w-0">
            <span className="block truncate text-sm text-ink">{p.display_name}</span>
            <span className="block truncate text-xs text-ink-muted">@{p.username}</span>
          </span>
        </Link>
      ))}

      {pageRows.map((p) => (
        <Link key={p.id} to={`/page/${p.username}`} className="flex items-center gap-3 py-2 min-h-[48px]">
          <Avatar src={p.avatar_url} name={p.name} size="sm" />
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm text-ink">{p.name}</span>
              {p.is_verified && <VerifiedBadge className="shrink-0" />}
            </span>
            <span className="block truncate text-xs text-ink-muted">@{p.username}</span>
          </span>
        </Link>
      ))}

      {projectRows.map((p) => (
        <div key={p.id} className="flex items-center gap-3 min-h-[48px]">
          <button onClick={() => onSubmit(p.title)} className="flex-1 min-w-0 flex items-center gap-3 py-3 text-left">
            <Search size={16} className="shrink-0 text-ink-muted" />
            <span className="flex-1 min-w-0 truncate text-sm text-ink">
              <Highlighted text={p.title} query={query} />
            </span>
            <span className="shrink-0 text-xs text-ink-muted">{PROJECT_TYPE_LABELS[p.project_type]}</span>
          </button>
          <button
            onClick={() => onFill(p.title)}
            aria-label={`Use “${p.title}” as your search`}
            className="shrink-0 p-3 -mr-3 text-ink-muted hover:text-ink"
          >
            <ArrowUpLeft size={16} />
          </button>
        </div>
      ))}

      {!hasRows && loading && <Skeleton />}
    </div>
  );
}
