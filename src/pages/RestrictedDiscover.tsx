import { useState } from "react";
import { Search, X } from "lucide-react";
import { useSuggestedPages, useSuggestedProjects } from "../hooks/useSearch";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { PageRow } from "../components/PageRow";
import { ProjectMiniGrid } from "../components/ProjectMiniCard";
import { SearchResults, isSearchable } from "../components/SearchResults";
import { AutoHideTopBar } from "../components/AutoHideTopBar";
import { BottomNav } from "../components/BottomNav";
import { TopHeader } from "../components/TopHeader";

// Discover for restricted (consumer-only) accounts: projects and pages — never people or posts.
export function RestrictedDiscover() {
  const [query, setQuery] = useState("");
  // The input stays bound to `query` so typing feels instant; only the
  // search queries wait for a pause (they used to fire on every
  // keystroke, one of them an unindexable leading-wildcard ilike).
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data: suggestedProjects, isLoading: suggestedProjectsLoading } = useSuggestedProjects();
  const { data: suggestedPages, isLoading: suggestedPagesLoading } = useSuggestedPages();

  const isSearching = isSearchable(query);

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <AutoHideTopBar>
        <TopHeader />
      </AutoHideTopBar>

      <div className="max-w-xl md:max-w-2xl mx-auto px-4 pt-4">
        {/* Search bar */}
        <div className="relative mb-6">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
          />
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-label="Search pages and projects"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and projects…"
            className="w-full pl-10 pr-11 py-3 rounded-2xl border border-border bg-surface text-ink text-sm
              placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
              [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-ink-muted p-3"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {isSearching ? (
          <SearchResults query={debouncedQuery} isPending={query !== debouncedQuery} scope="discover" />
        ) : (
          <>
            {/* Suggested projects */}
            <section className="mb-8">
              <h2 className="font-display text-xl text-ink mb-0.5">Projects to explore</h2>
              <p className="text-ink-muted text-sm mb-4">Popular and recent work from across Akọ.</p>

              {suggestedProjectsLoading ? (
                <p className="text-ink-muted text-sm py-4">Loading…</p>
              ) : suggestedProjects && suggestedProjects.length > 0 ? (
                <ProjectMiniGrid projects={suggestedProjects} />
              ) : (
                <p className="text-ink-muted text-sm py-4">No projects to show right now.</p>
              )}
            </section>

            {/* Suggested pages */}
            <section className="mb-8">
              <h2 className="font-display text-xl text-ink mb-0.5">Pages to follow</h2>
              <p className="text-ink-muted text-sm mb-4">Organisations, brands and products worth a look.</p>

              {suggestedPagesLoading ? (
                <p className="text-ink-muted text-sm py-4">Loading…</p>
              ) : suggestedPages && suggestedPages.length > 0 ? (
                <div className="divide-y divide-border">
                  {suggestedPages.map((p) => (
                    <PageRow key={p.id} page={p} />
                  ))}
                </div>
              ) : (
                <p className="text-ink-muted text-sm py-4">No pages to suggest right now.</p>
              )}
            </section>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
                  }
