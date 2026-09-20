import { useState } from "react";
import { useSmartBack } from "../hooks/useSmartBack";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { ArrowLeft, Search as SearchIcon, X } from "lucide-react";
import { SearchResults, isSearchable } from "../components/SearchResults";
import { BottomNav } from "../components/BottomNav";

export function Search() {
  const smartBack = useSmartBack();
  const [query, setQuery] = useState("");

  // The input itself stays driven by `query` for immediate, responsive
  // typing — only the searches wait for typing to pause, so a fast
  // typer doesn't fire a burst of racing queries for half-typed words.
  const debouncedQuery = useDebouncedValue(query, 300);

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30">
        <div className="flex items-center gap-3 max-w-xl md:max-w-2xl mx-auto">
          <button onClick={smartBack} className="text-ink-muted p-2 -m-2" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-surface rounded-full px-4 py-2">
            <SearchIcon size={16} className="text-ink-muted shrink-0" />
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
              placeholder="Search Akọ"
              autoFocus
              className="flex-1 min-w-0 bg-transparent text-ink focus:outline-none text-sm [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query.length > 0 && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="text-ink-muted p-2 -m-2 shrink-0"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-xl md:max-w-2xl mx-auto px-4 pt-2">
        {isSearchable(query) ? (
          <SearchResults query={debouncedQuery} isPending={query !== debouncedQuery} />
        ) : (
          <div className="flex flex-col items-center text-center py-14 px-6">
            <span className="flex items-center justify-center w-14 h-14 rounded-full bg-accent-soft text-accent mb-3">
              <SearchIcon size={22} />
            </span>
            <p className="text-ink-muted text-sm">Search for people, pages, posts or projects.</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
