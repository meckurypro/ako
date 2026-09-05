import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, ChevronDown, X } from "lucide-react";
import { useCategories } from "../hooks/useCategories";
import { useSearchPeople, useSearchPosts, useSuggestedPeople } from "../hooks/useSearch";
import { useTabState } from "../hooks/useTabState";
import { Avatar } from "../components/Avatar";
import { TierBadge } from "../components/TierBadge";
import { RoleTags } from "../components/RoleTags";
import { PostCard } from "../components/PostCard";
import { BottomNav } from "../components/BottomNav";
import { TopHeader } from "../components/TopHeader";
import type { ProfileWithRoles } from "../types/database";

function PersonRow({ profile }: { profile: ProfileWithRoles }) {
  return (
    <Link
      to={`/profile/${profile.username}`}
      className="flex items-center gap-3 py-3"
    >
      <Avatar src={profile.avatar_url} name={profile.display_name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-ink text-sm">{profile.display_name}</span>
          <TierBadge tier={profile.tier} />
        </div>
        {profile.roles?.length > 0 && (
          <RoleTags roles={profile.roles} className="text-xs text-ink-muted" />
        )}
        <p className="text-xs text-ink-muted mt-0.5">@{profile.username}</p>
      </div>
      {profile.follower_count > 0 && (
        <span className="text-xs text-ink-muted shrink-0">
          {profile.follower_count.toLocaleString()} followers
        </span>
      )}
    </Link>
  );
}

export function Discover() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useTabState<"people" | "posts">(["people", "posts"], "people");
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: suggestedPeople, isLoading: suggestedLoading } = useSuggestedPeople();
  const { data: peopleResults, isLoading: peopleLoading } = useSearchPeople(query);
  const { data: postResults, isLoading: postsLoading } = useSearchPosts(query);

  const isSearching = query.trim().length > 1;

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <TopHeader />

      <div className="max-w-xl mx-auto px-4 pt-4">
        {/* Search bar */}
        <div className="relative mb-6">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people or posts…"
            className="w-full pl-10 pr-10 py-3 rounded-2xl border border-border bg-surface text-ink text-sm
              placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {isSearching ? (
          <>
            {/* Tab bar */}
            <div className="flex gap-6 border-b border-border mb-4">
              <button
                onClick={() => setActiveTab("people")}
                className={`text-sm font-medium pb-3 border-b-2 -mb-px transition-colors ${
                  activeTab === "people"
                    ? "text-accent border-accent"
                    : "text-ink-muted border-transparent"
                }`}
              >
                People
              </button>
              <button
                onClick={() => setActiveTab("posts")}
                className={`text-sm font-medium pb-3 border-b-2 -mb-px transition-colors ${
                  activeTab === "posts"
                    ? "text-accent border-accent"
                    : "text-ink-muted border-transparent"
                }`}
              >
                Posts
              </button>
            </div>

            {activeTab === "people" ? (
              peopleLoading ? (
                <p className="text-ink-muted text-center py-10 text-sm">Searching…</p>
              ) : peopleResults && peopleResults.length > 0 ? (
                <div className="divide-y divide-border">
                  {peopleResults.map((p) => (
                    <PersonRow key={p.id} profile={p} />
                  ))}
                </div>
              ) : (
                <p className="text-ink-muted text-center py-10 text-sm">No people found.</p>
              )
            ) : postsLoading ? (
              <p className="text-ink-muted text-center py-10 text-sm">Searching…</p>
            ) : postResults && postResults.length > 0 ? (
              postResults.map((post) => <PostCard key={post.id} post={post} />)
            ) : (
              <p className="text-ink-muted text-center py-10 text-sm">No posts found.</p>
            )}
          </>
        ) : (
          <>
            {/* Suggested people */}
            <section className="mb-8">
              <h2 className="font-display text-xl text-ink mb-0.5">People to follow</h2>
              <p className="text-ink-muted text-sm mb-4">Based on your network and activity.</p>

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
