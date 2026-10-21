import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, X } from "lucide-react";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useRecentSearches } from "../../hooks/useRecentSearches";
import { AutoHideTopBar } from "../AutoHideTopBar";
import { BottomNav } from "../BottomNav";
import { TopHeader } from "../TopHeader";
import { SearchResults, isSearchable, type SearchScope } from "../SearchResults";
import { SearchStart } from "./SearchStart";
import { SearchSuggestions } from "./SearchSuggestions";

// The Discover page's search experience, modelled on TikTok's:
//
//   browse   – the page itself, with a pill search bar at the top.
//   typing   – tap the bar: the page gives way to recent searches + trending;
//              as you type, to live suggestions.
//   results  – submit (Enter, "Search", or any suggestion): results under
//              tabs. The submitted query lives in the URL (?q=), so the
//              browser Back button steps results → browse, like a native app.
//
// One shell serves both account kinds. `scope` is the only difference:
// "all" (full accounts) searches people, pages, posts and projects and offers
// hashtags; "discover" (restricted, consumer-only accounts) searches pages and
// projects only — never people or posts.
//
// The input element is rendered once, in the same place in every phase, so
// focus is never lost when the layout changes around it.

type Phase = "browse" | "typing" | "results";

export function DiscoverShell({
  scope,
  placeholder,
  ariaLabel,
  browse,
}: {
  scope: SearchScope;
  placeholder: string;
  ariaLabel: string;
  /** The page shown when not searching. */
  browse: ReactNode;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const submitted = (searchParams.get("q") ?? "").trim();

  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState(submitted);
  const inputRef = useRef<HTMLInputElement>(null);
  // True once this visit has pushed a results entry, so "back" can pop it
  // instead of stacking another one.
  const pushedRef = useRef(false);

  const recents = useRecentSearches();
  const debouncedDraft = useDebouncedValue(draft.trim(), 200);

  const phase: Phase = typing ? "typing" : submitted ? "results" : "browse";

  // The URL is the source of truth for the submitted query: when it changes
  // from outside (browser Back/Forward, a deep link), follow it.
  useEffect(() => {
    setDraft(submitted);
    setTyping(false);
  }, [submitted]);

  // Each phase starts at the top — a fresh surface, not a scrolled-down one.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [phase]);

  function submit(term: string) {
    const t = term.trim();
    if (!isSearchable(t)) return;
    recents.add(t);
    setDraft(t);
    setTyping(false);
    inputRef.current?.blur();
    if (t === submitted) return;
    const next = new URLSearchParams(searchParams);
    next.set("q", t);
    next.delete("tab");
    setSearchParams(next);
    pushedRef.current = true;
  }

  function leave() {
    inputRef.current?.blur();
    if (phase === "typing") {
      // Abandon the edit: back to results if there are some, else browse.
      setDraft(submitted);
      setTyping(false);
      return;
    }
    // From results → browse.
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    next.delete("tab");
    setSearchParams(next, { replace: true });
  }

  const showBack = phase !== "browse";
  const canSubmit = isSearchable(draft);

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {phase === "browse" && (
        <AutoHideTopBar>
          <TopHeader />
        </AutoHideTopBar>
      )}

      <div className="max-w-xl md:max-w-2xl mx-auto px-4">
        <div
          className={
            phase === "browse"
              ? "pt-4 pb-6"
              : "sticky top-0 z-chrome bg-canvas -mx-4 px-4 pt-4 pb-3"
          }
        >
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              submit(draft);
            }}
            className="flex items-center gap-2"
          >
            {showBack && (
              <button
                type="button"
                onClick={leave}
                aria-label="Back"
                className="shrink-0 p-2 -ml-2 text-ink-muted hover:text-ink"
              >
                <ArrowLeft size={22} />
              </button>
            )}

            <div className="relative flex-1 min-w-0">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-orange pointer-events-none"
              />
              <input
                ref={inputRef}
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-label={ariaLabel}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => setTyping(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") leave();
                }}
                placeholder={placeholder}
                className="w-full h-11 pl-10 pr-10 rounded-full border border-border bg-surface text-ink text-sm
                  placeholder:text-ink-muted focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20
                  [&::-webkit-search-cancel-button]:appearance-none"
              />
              {draft && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-3 text-ink-muted hover:text-ink"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {phase === "typing" && canSubmit && (
              <button type="submit" className="shrink-0 px-1 text-sm font-medium text-accent">
                Search
              </button>
            )}
          </form>
        </div>

        {phase === "browse" && browse}

        {phase === "typing" &&
          (canSubmit ? (
            <SearchSuggestions
              query={debouncedDraft}
              typed={draft}
              scope={scope}
              onSubmit={submit}
              onFill={(term) => {
                setDraft(term);
                inputRef.current?.focus();
              }}
            />
          ) : (
            <SearchStart
              scope={scope}
              recents={recents.items}
              onPick={submit}
              onRemoveRecent={recents.remove}
              onClearRecents={recents.clear}
            />
          ))}

        {phase === "results" && (
          <div className="animate-ako-fade-up pt-1">
            <SearchResults
              query={submitted}
              scope={scope}
              stickyTabsClassName="sticky top-[72px] z-subchrome bg-canvas"
            />
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
