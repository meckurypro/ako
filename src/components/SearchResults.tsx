import type { ReactNode } from "react";
import { Search as SearchIcon } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTabState } from "../hooks/useTabState";
import {
  useSearchPages,
  useSearchPeople,
  useSearchPosts,
  useSearchProjects,
} from "../hooks/useSearch";
import { recordSearchVisit } from "../lib/searchVisits";
import { PersonRow } from "./PersonRow";
import { PageRow } from "./PageRow";
import { PostCard } from "./PostCard";
import { ProjectMiniGrid } from "./ProjectMiniCard";

// Shared by Discover and the standalone Search screen so both search
// the same things, the same way: people, pages, posts and projects,
// with an "All" overview that previews each and jumps to the full list.

const TABS = ["all", "people", "pages", "posts", "projects"] as const;
export type SearchTab = (typeof TABS)[number];

const TAB_LABELS: Record<SearchTab, string> = {
  all: "All",
  people: "People",
  pages: "Pages",
  posts: "Posts",
  projects: "Projects",
};

// Rows shown per section on the "All" overview before "See all".
const PREVIEW_COUNT = 3;

export const MIN_QUERY_LENGTH = 2;

export function isSearchable(query: string): boolean {
  return query.trim().length >= MIN_QUERY_LENGTH;
}

export function useSearchTab() {
  return useTabState<SearchTab>(TABS, "all");
}

function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="divide-y divide-border" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-surface shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-surface" />
            <div className="h-3 w-1/2 rounded bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      <span className="flex items-center justify-center w-14 h-14 rounded-full bg-accent-soft text-accent mb-3">
        <SearchIcon size={22} />
      </span>
      <p className="text-ink text-sm font-medium">{label}</p>
      {hint && <p className="text-ink-muted text-sm mt-1">{hint}</p>}
    </div>
  );
}

function ErrorState({ what }: { what: string }) {
  return (
    <p role="alert" className="text-ink-muted text-center py-10 text-sm">
      Couldn't load {what}. Check your connection and try again.
    </p>
  );
}

function Section({
  title,
  onSeeAll,
  showSeeAll,
  children,
}: {
  title: string;
  onSeeAll: () => void;
  showSeeAll: boolean;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="font-display text-base text-ink">{title}</h2>
        {showSeeAll && (
          <button onClick={onSeeAll} className="text-sm font-medium text-accent py-1 -my-1">
            See all
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

export function SearchResults({
  query,
  isPending = false,
  stickyTabsClassName = "",
}: {
  /** Already-debounced query. */
  query: string;
  /** True while the typed text is ahead of `query` — keeps stale empties from flashing. */
  isPending?: boolean;
  stickyTabsClassName?: string;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useSearchTab();

  const people = useSearchPeople(query);
  const pages = useSearchPages(query);
  const posts = useSearchPosts(query);
  const projects = useSearchProjects(query);

  const onVisit = (profileId: string) => recordSearchVisit(user?.id, profileId);

  const loading = (q: { isLoading: boolean }) => q.isLoading || isPending;

  function renderPeople(limit?: number) {
    if (loading(people)) return <SkeletonRows />;
    if (people.isError) return <ErrorState what="people" />;
    const rows = (people.data ?? []).slice(0, limit);
    if (rows.length === 0) return limit ? null : <EmptyState label="No people found" hint="Try a name or @username." />;
    return (
      <div className="divide-y divide-border">
        {rows.map((p) => (
          <PersonRow key={p.id} profile={p} onVisit={onVisit} />
        ))}
      </div>
    );
  }

  function renderPages(limit?: number) {
    if (loading(pages)) return <SkeletonRows />;
    if (pages.isError) return <ErrorState what="pages" />;
    const rows = (pages.data ?? []).slice(0, limit);
    if (rows.length === 0) return limit ? null : <EmptyState label="No pages found" hint="Try a page name, @username or tagline." />;
    return (
      <div className="divide-y divide-border">
        {rows.map((p) => (
          <PageRow key={p.id} page={p} />
        ))}
      </div>
    );
  }

  function renderPosts(limit?: number) {
    if (loading(posts)) return <SkeletonRows />;
    if (posts.isError) return <ErrorState what="posts" />;
    const rows = (posts.data ?? []).slice(0, limit);
    if (rows.length === 0) return limit ? null : <EmptyState label="No posts found" hint="Try different keywords." />;
    return <>{rows.map((post) => <PostCard key={post.id} post={post} />)}</>;
  }

  function renderProjects(limit?: number) {
    if (loading(projects)) return <SkeletonRows />;
    if (projects.isError) return <ErrorState what="projects" />;
    const rows = (projects.data ?? []).slice(0, limit);
    if (rows.length === 0) return limit ? null : <EmptyState label="No projects found" hint="Try a title or keyword." />;
    return <ProjectMiniGrid projects={rows} />;
  }

  // "All": show only sections that have something, so a query that only
  // matches a page doesn't render three empty headings above it. The
  // one empty state appears only once every source has settled empty.
  const settled = !isPending && ![people, pages, posts, projects].some((q) => q.isLoading);
  const allEmpty =
    settled &&
    [people, pages, posts, projects].every((q) => !q.isError && (q.data ?? []).length === 0);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Search results"
        className={`flex gap-5 border-b border-border mb-4 overflow-x-auto no-scrollbar ${stickyTabsClassName}`}
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`shrink-0 text-sm font-medium pb-3 pt-1 border-b-2 -mb-px transition-colors ${
              tab === t ? "text-accent border-accent" : "text-ink-muted border-transparent"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "people" && renderPeople()}
        {tab === "pages" && renderPages()}
        {tab === "posts" && renderPosts()}
        {tab === "projects" && renderProjects()}

        {tab === "all" &&
          (allEmpty ? (
            <EmptyState label={`No results for “${query.trim()}”`} hint="Check the spelling or try a shorter search." />
          ) : (
            <>
              {(loading(people) || (people.data?.length ?? 0) > 0 || people.isError) && (
                <Section title="People" showSeeAll={(people.data?.length ?? 0) > PREVIEW_COUNT} onSeeAll={() => setTab("people")}>
                  {renderPeople(PREVIEW_COUNT)}
                </Section>
              )}
              {(loading(pages) || (pages.data?.length ?? 0) > 0 || pages.isError) && (
                <Section title="Pages" showSeeAll={(pages.data?.length ?? 0) > PREVIEW_COUNT} onSeeAll={() => setTab("pages")}>
                  {renderPages(PREVIEW_COUNT)}
                </Section>
              )}
              {(loading(projects) || (projects.data?.length ?? 0) > 0 || projects.isError) && (
                <Section title="Projects" showSeeAll={(projects.data?.length ?? 0) > PREVIEW_COUNT} onSeeAll={() => setTab("projects")}>
                  {renderProjects(PREVIEW_COUNT)}
                </Section>
              )}
              {(loading(posts) || (posts.data?.length ?? 0) > 0 || posts.isError) && (
                <Section title="Posts" showSeeAll={(posts.data?.length ?? 0) > PREVIEW_COUNT} onSeeAll={() => setTab("posts")}>
                  {renderPosts(PREVIEW_COUNT)}
                </Section>
              )}
            </>
          ))}
      </div>
    </div>
  );
}
