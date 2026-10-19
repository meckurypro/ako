import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Clock, TrendingUp, X } from "lucide-react";
import { useTrendingHashtags, type HashtagSuggestion } from "../../hooks/useDiscoverSearch";
import { useSuggestedProjects } from "../../hooks/useSearch";
import { PROJECT_TYPE_LABELS, type Project } from "../../hooks/useProjects";
import type { SearchScope } from "../SearchResults";

// What the search screen shows the moment the bar is tapped, before anything
// is typed — the same two blocks TikTok opens with: your recent searches, then
// what's trending. Full accounts see trending hashtags; restricted accounts
// (no posts, so no hashtags) see popular projects instead.

const RECENT_COLLAPSED = 5;
const TRENDING_LIMIT = 6;

function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">{children}</h2>
      {action}
    </div>
  );
}

function Recent({
  items,
  onPick,
  onRemove,
  onClear,
}: {
  items: string[];
  onPick: (term: string) => void;
  onRemove: (term: string) => void;
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  const visible = expanded ? items : items.slice(0, RECENT_COLLAPSED);

  return (
    <section className="mb-7">
      <SectionLabel
        action={
          <button onClick={onClear} className="text-xs font-medium text-ink-muted py-1 -my-1 hover:text-ink">
            Clear all
          </button>
        }
      >
        Recent
      </SectionLabel>
      <ul>
        {visible.map((term) => (
          <li key={term} className="flex items-center gap-3 min-h-[48px]">
            <button onClick={() => onPick(term)} className="flex-1 min-w-0 flex items-center gap-3 py-3 text-left">
              <Clock size={16} className="shrink-0 text-ink-muted" />
              <span className="truncate text-sm text-ink">{term}</span>
            </button>
            <button
              onClick={() => onRemove(term)}
              aria-label={`Remove ${term} from recent searches`}
              className="shrink-0 p-3 -mr-3 text-ink-muted hover:text-ink"
            >
              <X size={15} />
            </button>
          </li>
        ))}
      </ul>
      {items.length > RECENT_COLLAPSED && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-sm font-medium text-ink-muted py-2 hover:text-ink"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </section>
  );
}

function Rank({ n }: { n: number }) {
  return <span className="w-4 shrink-0 text-xs tabular-nums text-ink-muted">{n}</span>;
}

function TrendingHashtags({ tags }: { tags: HashtagSuggestion[] }) {
  return (
    <ul>
      {tags.map((h, i) => (
        <li key={h.id}>
          <Link to={`/hashtag/${encodeURIComponent(h.tag)}`} className="flex items-center gap-3 py-3 min-h-[48px]">
            <Rank n={i + 1} />
            <span className="flex-1 min-w-0 truncate text-sm text-ink">#{h.tag}</span>
            <span className="shrink-0 text-xs text-ink-muted">
              {h.usage_count.toLocaleString()} {h.usage_count === 1 ? "post" : "posts"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TrendingProjects({ projects, onPick }: { projects: Project[]; onPick: (term: string) => void }) {
  return (
    <ul>
      {projects.map((p, i) => (
        <li key={p.id}>
          <button onClick={() => onPick(p.title)} className="w-full flex items-center gap-3 py-3 min-h-[48px] text-left">
            <Rank n={i + 1} />
            <span className="flex-1 min-w-0 truncate text-sm text-ink">{p.title}</span>
            <span className="shrink-0 text-xs text-ink-muted">{PROJECT_TYPE_LABELS[p.project_type]}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function SearchStart({
  scope,
  recents,
  onPick,
  onRemoveRecent,
  onClearRecents,
}: {
  scope: SearchScope;
  recents: string[];
  onPick: (term: string) => void;
  onRemoveRecent: (term: string) => void;
  onClearRecents: () => void;
}) {
  const tags = useTrendingHashtags(scope === "all");
  const projects = useSuggestedProjects(scope === "discover");
  const tagRows = scope === "all" ? tags.data ?? [] : [];
  const projectRows = scope === "discover" ? (projects.data ?? []).slice(0, TRENDING_LIMIT) : [];
  const hasTrending = tagRows.length > 0 || projectRows.length > 0;
  const loading = scope === "all" ? tags.isLoading : projects.isLoading;

  return (
    <div className="animate-ako-fade-up pt-2">
      <Recent items={recents} onPick={onPick} onRemove={onRemoveRecent} onClear={onClearRecents} />

      {hasTrending && (
        <section>
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp size={12} />
              Trending
            </span>
          </SectionLabel>
          {scope === "all" ? <TrendingHashtags tags={tagRows} /> : <TrendingProjects projects={projectRows} onPick={onPick} />}
        </section>
      )}

      {!hasTrending && !loading && recents.length === 0 && (
        <p className="text-sm text-ink-muted text-center py-14 px-6">
          {scope === "all" ? "Search for people, pages, posts or projects." : "Search for pages and projects."}
        </p>
      )}
    </div>
  );
}
