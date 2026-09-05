import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import { useFeedPosts, useFollowingFeed, useTopDiscussionsFeed } from "../hooks/usePosts";
import { useTabState } from "../hooks/useTabState";
import { PostCard } from "../components/PostCard";
import { BottomNav } from "../components/BottomNav";
import { TopHeader } from "../components/TopHeader";
import { SwipeableTabs } from "../components/SwipeableTabs";

// "Saved" moved into the Activity hub (see SavedHub.tsx, reachable
// from the Activity icon in BottomNav) — it now covers saved posts
// AND saved projects in one place, rather than living here as a
// posts-only feed tab.
const TABS = [
  { key: "for-you", label: "For You" },
  { key: "top", label: "Top Discussions" },
  { key: "following", label: "Following" },
] as const;

type TabKey = (typeof TABS)[number]["key"];
const TAB_KEYS = TABS.map((t) => t.key);

function useAccumulatedPages<T>(pageData: T[] | undefined, page: number, resetKey: unknown) {
  const [all, setAll] = useState<T[]>([]);

  useEffect(() => {
    setAll([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (!pageData) return;
    setAll((prev) => (page === 0 ? pageData : [...prev, ...pageData]));
  }, [pageData, page]);

  return all;
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-ink-muted text-center py-16 text-sm">{message}</p>;
}

function LoadMoreButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-sm text-accent font-medium py-3 mb-4">
      Load more
    </button>
  );
}

function ForYouTab({ interestId }: { interestId?: string }) {
  const [page, setPage] = useState(0);
  const { data: pagePosts, isLoading, error } = useFeedPosts(interestId, page);
  const posts = useAccumulatedPages(pagePosts, page, interestId);

  useEffect(() => setPage(0), [interestId]);

  if (isLoading && page === 0) return <p className="text-ink-muted text-center py-10">Loading your feed…</p>;
  if (error) return (
    <p className="text-danger text-center py-10 px-4 text-sm break-words">
      Couldn't load the feed: {(error as any)?.message ?? String(error)}
      {(error as any)?.hint && <> — hint: {(error as any).hint}</>}
    </p>
  );
  if (posts.length === 0 && page === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-ink-muted mb-4">No posts yet. Be the first to share a thought.</p>
        <Link to="/compose" className="inline-block bg-accent text-canvas px-5 py-2.5 rounded-full text-sm font-medium">
          Write something
        </Link>
      </div>
    );
  }

  return (
    <>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {posts.length > 0 && <LoadMoreButton onClick={() => setPage((p) => p + 1)} />}
    </>
  );
}

function FollowingTab() {
  const [page, setPage] = useState(0);
  const { data: pagePosts, isLoading, error } = useFollowingFeed(page);
  const posts = useAccumulatedPages(pagePosts, page, "following");

  if (isLoading && page === 0) return <p className="text-ink-muted text-center py-10">Loading…</p>;
  if (error) return <p className="text-danger text-center py-10">Couldn't load this feed. Try again.</p>;
  if (posts.length === 0 && page === 0) {
    return <EmptyState message="No posts from people you follow yet. Follow a few people to see their posts here." />;
  }

  return (
    <>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {posts.length > 0 && <LoadMoreButton onClick={() => setPage((p) => p + 1)} />}
    </>
  );
}

function TopDiscussionsTab() {
  const [page, setPage] = useState(0);
  const { data: pagePosts, isLoading, error } = useTopDiscussionsFeed(page);
  const posts = useAccumulatedPages(pagePosts, page, "top");

  if (isLoading && page === 0) return <p className="text-ink-muted text-center py-10">Loading…</p>;
  if (error) return <p className="text-danger text-center py-10">Couldn't load this feed. Try again.</p>;
  if (posts.length === 0 && page === 0) {
    return <EmptyState message="Nothing's picked up much discussion in the last week yet." />;
  }

  return (
    <>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {posts.length > 0 && <LoadMoreButton onClick={() => setPage((p) => p + 1)} />}
    </>
  );
}

export function Feed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const interestId = searchParams.get("interest") ?? undefined;

  const [activeTab, setActiveTab] = useTabState<TabKey>(TAB_KEYS, "for-you");
  // Continuous tab position fed by SwipeableTabs' onProgress — e.g. 1.4
  // while 40% of the way from "top" toward "following" — so the sliding
  // indicator bar tracks the finger during the drag instead of only
  // jumping once the swipe commits. Defaults to the real index so the bar
  // starts in the right place before any drag has happened.
  const activeIndex = TABS.findIndex((t) => t.key === activeTab);
  const [tabProgress, setTabProgress] = useState(activeIndex);
  const [tabDragging, setTabDragging] = useState(false);

  useEffect(() => {
    if (interestId) setActiveTab("for-you");
  }, [interestId]);

  function handleTabClick(index: number, key: TabKey) {
    if (index === activeIndex) return;
    setActiveTab(key);
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <div className="sticky top-0 z-20 bg-surface shadow-[0_2px_8px_-4px_rgba(var(--shadow-ink-rgb),0.10)]">
        <TopHeader showTagline leftAction="create" />

        <div className="px-4">
          {/* Equal-width columns (not intrinsic-width + fixed gap) so the
              three tabs sit evenly spaced regardless of label length —
              "Top Discussions" no longer crowds its neighbors. The active
              indicator is now one sliding bar (see below) instead of each
              button drawing its own border, so it can spring across to the
              new position instead of just appearing on a different tab. */}
          <div className="max-w-xl mx-auto relative grid grid-cols-3 pb-1">
            {TABS.map((tab, i) => (
              <button
                key={tab.key}
                onClick={() => handleTabClick(i, tab.key)}
                className={`whitespace-nowrap text-sm font-semibold pb-2 pt-1 text-center ${
                  activeTab === tab.key ? "text-accent" : "text-ink-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div
              className={`ako-tab-indicator absolute bottom-0 left-0 h-[4px] w-1/3 bg-accent rounded-full ${
                tabDragging ? "ako-tab-indicator--dragging" : ""
              }`}
              style={{ transform: `translateX(${tabProgress * 100}%)` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 pt-5">
        {activeTab === "for-you" && interestId && (
          <button
            onClick={() => setSearchParams({})}
            className="flex items-center gap-1.5 text-sm text-accent bg-accent-soft rounded-full px-3 py-1.5 mb-4 w-fit"
          >
            Filtered by topic
            <X size={14} />
          </button>
        )}

        {/* Real drag-tracking carousel — content follows your finger during
            the swipe, WhatsApp-style, and settles into the nearest tab on
            release. All three tabs are mounted at once (see
            SwipeableTabs.tsx) so the neighboring pane is already there to
            slide into view mid-gesture. */}
        <SwipeableTabs
          index={activeIndex}
          onIndexChange={(i) => setActiveTab(TABS[i].key)}
          onProgress={(progress, dragging) => {
            setTabProgress(progress);
            setTabDragging(dragging);
          }}
        >
          {[
            <ForYouTab key="for-you" interestId={interestId} />,
            <TopDiscussionsTab key="top" />,
            <FollowingTab key="following" />,
          ]}
        </SwipeableTabs>
      </div>

      <BottomNav />
    </div>
  );
}
