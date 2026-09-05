import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search as SearchIcon } from "lucide-react";
import { useSearchPosts, useSearchPeople } from "../hooks/useSearch";
import { useTabState } from "../hooks/useTabState";
import { PostCard } from "../components/PostCard";
import { Avatar } from "../components/Avatar";
import { BottomNav } from "../components/BottomNav";

export function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useTabState<"posts" | "people">(["posts", "people"], "posts");

  const { data: posts, isLoading: postsLoading } = useSearchPosts(query);
  const { data: people, isLoading: peopleLoading } = useSearchPeople(query);

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-surface rounded-full px-4 py-2">
            <SearchIcon size={16} className="text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Akọ"
              autoFocus
              className="flex-1 bg-transparent text-ink focus:outline-none text-sm"
            />
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
          <p className="text-ink-muted text-center py-10 text-sm">
            Search for ideas, discussions, or people.
          </p>
        ) : tab === "posts" ? (
          postsLoading ? (
            <p className="text-ink-muted text-center py-10">Searching…</p>
          ) : !posts || posts.length === 0 ? (
            <p className="text-ink-muted text-center py-10 text-sm">No posts found.</p>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )
        ) : peopleLoading ? (
          <p className="text-ink-muted text-center py-10">Searching…</p>
        ) : !people || people.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">No people found.</p>
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
