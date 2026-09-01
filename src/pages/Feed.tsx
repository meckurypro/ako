import { useEffect, useState, type TouchEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import { useFeedPosts, useFollowingFeed, useTopDiscussionsFeed } from "../hooks/usePosts";
import { useBookmarkedPosts } from "../hooks/useBookmarks";
import { PostCard } from "../components/PostCard";
import { BottomNav } from "../components/BottomNav";
import { TopHeader } from "../components/TopHeader";
import type { PostWithAuthor } from "../types/database";

const TABS = [
  { key: "for-you", label: "For You" },
  { key: "following", label: "Following" },
  { key: "top", label: "Top Discussions" },
  { key: "saved", label: "Saved" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const SWIPE_THRESHOLD_PX = 50;

// Accumulates "Load more" pages into one running list, and resets
// back to empty whenever resetKey changes (tab switch, filter change).
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
  if (error) return <p className="text-danger text-center py-10">Couldn't load the feed. Try again.</p>;
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

function SavedTab() {
  const { data: posts, isLoading, error } = useBookmarkedPosts();

  if (isLoading) return <p className="text-ink-muted text-center py-10">Loading…</p>;
  if (error) return <p className="text-danger text-center py-10">Couldn't load your saved posts. Try again.</p>;
  if (!posts || posts.length === 0) {
    return <EmptyState message="Nothing saved yet. Tap the save icon on a post to keep it here." />;
  }

  return (
    <>
      {posts.map((post: PostWithAuthor) => (
        <PostCard key={post.id} post={post} />
      ))}
    </>
  );
}

export function Feed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const interestId = searchParams.get("interest") ?? undefined;

  // Topic filtering only applies to "For You" — jumping here from the
  // Discover/Topics page should land on that tab so the filter is visible.
  const [activeTab, setActiveTab] = useState<TabKey>("for-you");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  useEffect(() => {
    if (interestId) setActiveTab("for-you");
  }, [interestId]);

  const activeIndex = TABS.findIndex((t) => t.key === activeTab);

  function goToIndex(index: number) {
    const clamped = Math.max(0, Math.min(TABS.length - 1, index));
    setActiveTab(TABS[clamped].key);
  }

  function handleTouchStart(e: TouchEvent) {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  }

  function handleTouchEnd(e: TouchEvent) {
    if (touchStartX === null || touchStartY === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    setTouchStartX(null);
    setTouchStartY(null);

    // Only treat it as a tab swipe when the gesture is clearly more
    // horizontal than vertical — otherwise a normal vertical scroll
    // through the post list would get hijacked into a tab change.
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    if (deltaX < 0) {
      goToIndex(activeIndex + 1); // swipe left -> next tab
    } else {
      goToIndex(activeIndex - 1); // swipe right -> previous tab
    }
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Header + tabs form one continuous bright bg-surface unit, like
          BottomNav does at the bottom. A single subtle shadow sits on
          the bottom edge of this whole block, casting onto the canvas
          content below — there's no shadow/seam between the header and
          the tabs row, since they're the same surface. */}
      <div className="sticky top-0 z-20 bg-surface shadow-[0_2px_8px_-4px_rgba(31,29,26,0.10)]">
        <TopHeader showTagline />

        <div className="px-4 overflow-x-auto scrollbar-none">
          <div className="max-w-xl mx-auto flex items-center gap-6">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap text-sm font-medium pb-2 pt-1 border-b-[3px] -mb-px ${
                  activeTab === tab.key ? "text-accent border-accent" : "text-ink-muted border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* min-h ensures there's always enough touch surface to swipe on,
          even when the active tab's content (e.g. Saved with few/no
          items) doesn't fill the screen. */}
      <div
        className="max-w-xl mx-auto px-5 pt-5 min-h-[70vh]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {activeTab === "for-you" && interestId && (
          <button
            onClick={() => setSearchParams({})}
            className="flex items-center gap-1.5 text-sm text-accent bg-accent-soft rounded-full px-3 py-1.5 mb-4 w-fit"
          >
            Filtered by topic
            <X size={14} />
          </button>
        )}

        {activeTab === "for-you" && <ForYouTab interestId={interestId} />}
        {activeTab === "following" && <FollowingTab />}
        {activeTab === "top" && <TopDiscussionsTab />}
        {activeTab === "saved" && <SavedTab />}
      </div>

      <BottomNav />
    </div>
  );
}
