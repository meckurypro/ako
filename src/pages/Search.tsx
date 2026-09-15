import { useState } from "react";
import { Link } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { ArrowLeft, Search as SearchIcon, X } from "lucide-react";
import { useSearchPosts, useSearchPeople } from "../hooks/useSearch";
import { useTabState } from "../hooks/useTabState";
import { PostCard } from "../components/PostCard";
import { Avatar } from "../components/Avatar";
import { BottomNav } from "../components/BottomNav";

export function Search() {
  const smartBack = useSmartBack();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useTabState<"posts" | "people">(["posts", "people"], "posts");

  // The input itself stays driven by `query` for immediate, responsive
  // typing — only the two queries below wait for typing to pause. Was
  // previously wired straight to `query`, so every keystroke fired both
  // a posts and a people query (the people one an unindexable leading-
  // wildcard `ilike`), all racing each other and hitting the DB for
  // characters the user was already typing past.
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data: posts, isLoading: postsLoading } = useSearchPosts(debouncedQuery);
  const { data: people, isLoading: peopleLoading } = useSearchPeople(debouncedQuery);

  // True the instant a keystroke lands but before the debounced query
  // has caught up — without this, clearing "No results" only after the
  // 300ms settles means a fast typer briefly sees a stale empty state
  // for a query that hasn't actually been searched yet.
  const isPending = query !== debouncedQuery;

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={smartBack} className="text-ink-muted p-1 -m-1" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-surface rounded-full px-4 py-2">
            <SearchIcon size={16} className="text-ink-muted shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Akọ"
              autoFocus
              className="flex-1 min-w-0 bg-transparent text-ink focus:outline-none text-sm"
            />
            {query.length > 0 && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="text-ink-muted p-1 -m-1 shrink-0"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-4 max-w-xl mx-auto">
          <button
            onClick={() => setTab("posts")}
            className={`text-sm font-medium pb-2 border-b-2 ${
              tab === "posts" ? "text-accent border-accent" : "text-ink-muted border-transparent"
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setTab("people")}
            className={`text-sm font-medium pb-2 border-b-2 ${
              tab === "people" ? "text-accent border-accent" : "text-ink-muted border-transparent"
            }`}
          >
            People
          </button>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-4">
        {query.trim().length <= 1 ? (
          <div className="flex flex-col items-center text-center py-14 px-6">
            <span className="flex items-center justify-center w-14 h-14 rounded-full bg-accent-soft text-accent mb-3">
              <SearchIcon size={22} />
            </span>
            <p className="text-ink-muted text-sm">Search for ideas, discussions, or people.</p>
          </div>
        ) : tab === "posts" ? (
          postsLoading || isPending ? (
            <p className="text-ink-muted text-center py-10">Searching…</p>
          ) : !posts || posts.length === 0 ? (
            <EmptyResult label="No posts found." />
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )
        ) : peopleLoading || isPending ? (
          <p className="text-ink-muted text-center py-10">Searching…</p>
        ) : !people || people.length === 0 ? (
          <EmptyResult label="No people found." />
        ) : (
          people.map((person) => (
            <Link
              key={person.id}
              to={`/profile/${person.username}`}
              className="flex items-center gap-3 py-3 border-b border-border"
            >
              <Avatar src={person.avatar_url} name={person.display_name} />
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{person.display_name}</p>
                <p className="text-sm text-ink-muted truncate">@{person.username}</p>
              </div>
            </Link>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}

// Matches the icon-in-soft-circle idiom already used for empty states
// elsewhere (Activity.tsx, etc.) — the plain center-aligned text this
// replaced was the one empty state in the app without it.
function EmptyResult({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      <span className="flex items-center justify-center w-14 h-14 rounded-full bg-accent-soft text-accent mb-3">
        <SearchIcon size={22} />
      </span>
      <p className="text-ink-muted text-sm">{label}</p>
    </div>
  );
}
