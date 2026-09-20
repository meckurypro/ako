import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown, X } from "lucide-react";
import { useCategories } from "../hooks/useCategories";
import { useSuggestedPages, useSuggestedPeople } from "../hooks/useSearch";
import { usePageSuggestedPeople } from "../hooks/usePageDiscover";
import { useActiveIdentity } from "../hooks/usePages";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { PersonRow } from "../components/PersonRow";
import { PageRow } from "../components/PageRow";
import { SearchResults, isSearchable } from "../components/SearchResults";
import { AutoHideTopBar } from "../components/AutoHideTopBar";
import { BottomNav } from "../components/BottomNav";
import { TopHeader } from "../components/TopHeader";

export function Discover() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  // The input stays bound to `query` so typing feels instant; only the
  // four search queries wait for a pause (they used to fire on every
  // keystroke, one of them an unindexable leading-wildcard ilike).
  const debouncedQuery = useDebouncedValue(query, 300);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: identity } = useActiveIdentity();
  const activePageId = identity?.mode === "page" ? identity.page.id : undefined;
  const personalSuggestions = useSuggestedPeople();
  const pageSuggestions = usePageSuggestedPeople(activePageId);
  const { data: suggestedPeople, isLoading: suggestedLoading } = activePageId
    ? pageSuggestions
    : personalSuggestions;
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
            aria-label="Search people, pages, posts and projects"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, pages, posts…"
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
          <SearchResults query={debouncedQuery} isPending={query !== debouncedQuery} />
        ) : (
          <>
            {/* Suggested people */}
            <section className="mb-8">
              <h2 className="font-display text-xl text-ink mb-0.5">People to follow</h2>
              <p className="text-ink-muted text-sm mb-4">
                {activePageId ? "Based on this page's network and activity." : "Based on your network and activity."}
              </p>

              {suggestedLoading ? (
                <p className="text-ink-muted text-sm py-4">Loading…</p>
              ) : suggestedPeople && suggestedPeople.length > 0 ? (
                <div className="divide-y divide-border">
                  {suggestedPeople.map((p) => (
                    <PersonRow key={p.id} profile={p} />
                  ))}
                </div>
              ) : (
                <p className="text-ink-muted text-sm py-4">No suggestions right now.</p>
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

            {/* Topics accordion */}
            <section>
              <h2 className="font-display text-xl text-ink mb-0.5">Topics</h2>
              <p className="text-ink-muted text-sm mb-4">Explore by what you care about.</p>

              {categoriesLoading ? (
                <p className="text-ink-muted text-sm py-4">Loading…</p>
              ) : (
                <div className="divide-y divide-border">
                  {categories?.map((category) => {
                    const isOpen = openCategoryId === category.id;
                    return (
                      <div key={category.id}>
                        <button
                          onClick={() =>
                            setOpenCategoryId((curr) =>
                              curr === category.id ? null : category.id
                            )
                          }
                          className="w-full flex items-center justify-between py-4 text-left"
                        >
                          <h3 className="font-display text-base text-ink">{category.name}</h3>
                          <ChevronDown
                            size={18}
                            className={`text-ink-muted transition-transform duration-300 ease-in-out ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        <div
                          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                            isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="flex flex-wrap gap-2 pb-4">
                              {category.interests.map((interest) => (
                                <button
                                  key={interest.id}
                                  onClick={() => navigate(`/feed?interest=${interest.id}`)}
                                  className="px-3.5 py-2 rounded-full text-sm bg-surface text-ink border border-border hover:border-accent/50"
                                >
                                  {interest.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
                  }
