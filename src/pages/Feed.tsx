import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { useFeedPosts, useFollowingFeed, useTopDiscussionsFeed, usePostById } from "../hooks/usePosts";
import { usePageRankedFeed, usePageFollowingFeed } from "../hooks/usePageFeed";
import { useActiveIdentity } from "../hooks/usePages";
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

// Scrolls to and briefly flashes the post that sent a visitor off to a
// profile they've now tapped "Back to post" to return from (see
// ProfilePage's fromFeedPost / "Back to post" FAB, which navigates
// here with location.state.scrollToPostId). Same scroll-into-view +
// timed flash pattern as CommentThread's highlightId — see CommentItem
// in CommentThread.tsx.
//
// Only wired into "For You" below — the tab a fresh /feed load always
// lands on — not Following/Top Discussions, since there's no reliable
// way to know which of the three tabs the originating post actually
// came from.
function FeedPostRow({ post, isTarget, active }: { post: any; isTarget: boolean; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [flashing, setFlashing] = useState(isTarget);

  useEffect(() => {
    if (!isTarget || !ref.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashing(true);
    const timeout = setTimeout(() => setFlashing(false), 2500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTarget]);

  return (
    <div
      id={`ako-feed-post-${post.id}`}
      ref={ref}
      className={`rounded-lg transition-colors duration-700 ${
        flashing ? "bg-highlight -mx-2 px-2 py-1.5" : ""
      }`}
    >
      <PostCard post={post} active={active} />
    </div>
  );
}

function ForYouTab({
  interestId,
  justPostedId,
  scrollToPostId,
  active,
}: {
  interestId?: string;
  justPostedId?: string | null;
  scrollToPostId?: string | null;
  active: boolean;
}) {
  const [page, setPage] = useState(0);
  const { data: identity } = useActiveIdentity();
  const activePageId = identity?.mode === "page" ? identity.page.id : undefined;
  const isPageMode = !!activePageId && !interestId;

  // Topic-filtered browsing ("everything tagged X") stays identity-
  // agnostic — only the personalized ranking swaps to the page's own
  // when acting as a page. See usePageFeed.ts for why.
  const personal = useFeedPosts(interestId, page);
  const pageFeed = usePageRankedFeed(isPageMode ? activePageId : undefined, page);
  const { data: pagePosts, isLoading, isFetching, error } = isPageMode ? pageFeed : personal;
  const posts = useAccumulatedPages(pagePosts, page, interestId ?? (isPageMode ? activePageId : "personal"));

  useEffect(() => setPage(0), [interestId, isPageMode]);

  // Right after publishing, wait for BOTH the ranked feed's fresh
  // refetch (triggered by useCreatePost's invalidate) and this one
  // post's own fetch before showing anything — a single loading state
  // that resolves once, into the final result, rather than flashing
  // the pre-post feed and then reordering when the refetch lands.
  // Only applies to page 0 of the plain, no-topic-filter "For You"
  // list — the one Compose actually redirects to.
  const pinning = !!justPostedId && page === 0 && !interestId && !isPageMode;
  const { data: justPostedPost, isLoading: isLoadingJustPosted, isError: justPostedFailed } = usePostById(
    pinning ? justPostedId : null
  );
  const waitingForFreshFeed = pinning && (isLoading || isFetching || (isLoadingJustPosted && !justPostedFailed));

  // "Back to post" fallback — if the target post isn't anywhere in
  // what's currently loaded (it's further down in pagination than
  // we've fetched, or it was originally seen in Following/Top
  // Discussions/a topic filter rather than this plain ranked list),
  // fetch it directly by id instead of silently having nothing to
  // scroll to. This is also *why* the scroll+flash treatment doesn't
  // need wiring into Following/Top Discussions separately: "Back to
  // post" always lands here on For You (see Feed()'s bare `/feed`
  // navigate with no `?tab=`), and this fallback guarantees the exact
  // post shows up here regardless of which feed it was ranked in
  // originally. Checked against the raw `posts` page (not
  // displayedPosts below, which doesn't exist yet this early) — close
  // enough, since justPostedPost and this are never the same post.
  const scrollTargetInList = !!scrollToPostId && posts.some((p) => p.id === scrollToPostId);
  const { data: fetchedScrollToPost } = usePostById(
    scrollToPostId && !scrollTargetInList ? scrollToPostId : null
  );

  if ((isLoading || waitingForFreshFeed) && page === 0) return <p className="text-ink-muted text-center py-10">Loading your feed…</p>;
  if (error) return (
    <p className="text-danger text-center py-10 px-4 text-sm break-words">
      Couldn't load the feed: {(error as any)?.message ?? String(error)}
      {(error as any)?.hint && <> — hint: {(error as any).hint}</>}
    </p>
  );
  if (posts.length === 0 && page === 0 && !justPostedPost && !fetchedScrollToPost) {
    return (
      <div className="text-center py-16">
        <p className="text-ink-muted mb-4">No posts yet. Be the first to share a thought.</p>
        <Link to="/compose" className="inline-block bg-accent text-canvas px-5 py-2.5 rounded-full text-sm font-medium">
          Write something
        </Link>
      </div>
    );
  }

  // The just-posted post is pinned first — the ranked feed itself has
  // no reason to place a brand-new, zero-engagement post anywhere near
  // the top (see usePostById's comment on get_ranked_feed) — with the
  // rest of the ranked list following, minus that same id in case the
  // algorithm also happened to surface it (avoids a duplicate card).
  const displayedPosts = justPostedPost
    ? [justPostedPost, ...posts.filter((p) => p.id !== justPostedPost.id)]
    : posts;

  // Once fetched, the "back to post" target is pinned above the ranked
  // list (own small label, same idea as "just posted") rather than
  // left wherever the ranking would otherwise put it — filtered out of
  // the ranked list below so it can't ever render twice if a later
  // page happens to also contain it.
  const rankedPosts = fetchedScrollToPost
    ? displayedPosts.filter((p) => p.id !== fetchedScrollToPost.id)
    : displayedPosts;

  return (
    <>
      {fetchedScrollToPost && (
        <div className="mb-4">
          <p className="text-xs text-ink-muted font-medium mb-2">Continuing from where you left off</p>
          <FeedPostRow post={fetchedScrollToPost} isTarget active={active} />
        </div>
      )}
      {rankedPosts.map((post) => (
        <FeedPostRow
          key={post.id}
          post={post}
          isTarget={!!scrollToPostId && post.id === scrollToPostId}
          active={active}
        />
      ))}
      {posts.length > 0 && <LoadMoreButton onClick={() => setPage((p) => p + 1)} />}
    </>
  );
}

function FollowingTab({ active }: { active: boolean }) {
  const [page, setPage] = useState(0);
  const { data: identity } = useActiveIdentity();
  const activePageId = identity?.mode === "page" ? identity.page.id : undefined;
  const isPageMode = !!activePageId;

  const personal = useFollowingFeed(page);
  const pageFeed = usePageFollowingFeed(isPageMode ? activePageId : undefined, page);
  const { data: pagePosts, isLoading, error } = isPageMode ? pageFeed : personal;
  const posts = useAccumulatedPages(pagePosts, page, isPageMode ? activePageId : "personal");

  useEffect(() => setPage(0), [isPageMode]);

  if (isLoading && page === 0) return <p className="text-ink-muted text-center py-10">Loading…</p>;
  if (error) return <p className="text-danger text-center py-10">Couldn't load this feed. Try again.</p>;
  if (posts.length === 0 && page === 0) {
    return <EmptyState message="No posts from people you follow yet. Follow a few people to see their posts here." />;
  }

  return (
    <>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} active={active} />
      ))}
      {posts.length > 0 && <LoadMoreButton onClick={() => setPage((p) => p + 1)} />}
    </>
  );
}

function TopDiscussionsTab({ active }: { active: boolean }) {
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
        <PostCard key={post.id} post={post} active={active} />
      ))}
      {posts.length > 0 && <LoadMoreButton onClick={() => setPage((p) => p + 1)} />}
    </>
  );
}

export function Feed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const interestId = searchParams.get("interest") ?? undefined;
  const location = useLocation();

  // Set by Compose right after publishing (see submitPost's navigate
  // call) — captured once into state, independent of location.state's
  // own lifetime, since the replaceState below clears it on this same
  // history entry right after the first render. Mirrors MessageThread's
  // draftMessage handling for the same reason: navigating back/forward
  // through history afterward shouldn't keep re-triggering it.
  const [justPostedId] = useState<string | null>(
    () => (location.state as { justPostedId?: string } | null)?.justPostedId ?? null
  );
  // Set by ProfilePage's "Back to post" FAB (see fromFeedPost there) —
  // the post whose byline sent the visitor to that profile in the
  // first place. Captured once the same way as justPostedId, for the
  // same reason: shouldn't keep re-triggering the scroll+flash below
  // on a later back/forward through history.
  const [scrollToPostId] = useState<string | null>(
    () => (location.state as { scrollToPostId?: string } | null)?.scrollToPostId ?? null
  );
  useEffect(() => {
    if (justPostedId || scrollToPostId) window.history.replaceState({}, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeTab, setActiveTab] = useTabState<TabKey>(TAB_KEYS, "for-you");
  // Continuous tab position fed by SwipeableTabs' onProgress — e.g. 1.4
  // while 40% of the way from "top" toward "following" — so the sliding
  // indicator bar tracks the finger during the drag instead of only
  // jumping once the swipe commits. Defaults to the real index so the bar
  // starts in the right place before any drag has happened.
  const activeIndex = TABS.findIndex((t) => t.key === activeTab);
  const [tabProgress, setTabProgress] = useState(activeIndex);
  const [tabDragging, setTabDragging] = useState(false);

  // Which of the three tabs have ever been the active one this visit —
  // starts with just whichever tab is active on mount (usually For You,
  // but a shared `?tab=` link can land elsewhere), and only ever grows.
  // Passed down as each tab's `active` prop so PostCard can defer its
  // bookmark/like/dislike/hasReshared queries for tabs still marked
  // false. SwipeableTabs mounts all three tabs' cards immediately (see
  // its own comment on why), so without this a fresh Feed load fired
  // those queries for every card across all three tabs at once — most
  // of it for tabs the visitor hadn't looked at yet. First swipe/tap
  // into a tab flips it to true for good; already-visited tabs never
  // re-fetch or get held back again.
  const [visitedTabs, setVisitedTabs] = useState<boolean[]>(() => TABS.map((_, i) => i === activeIndex));
  useEffect(() => {
    setVisitedTabs((prev) => (prev[activeIndex] ? prev : prev.map((v, i) => v || i === activeIndex)));
  }, [activeIndex]);

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
        {/* Desktop already has Create/Notifications/Profile in the
            persistent Sidebar (see Sidebar.tsx) — repeating them here
            would just be the same destinations twice. Mobile keeps the
            full header (Sidebar is md:hidden there). */}
        <div className="md:hidden">
          <TopHeader showTagline leftAction="create" asIcon iconTagline={false} />
        </div>
        <div className="hidden md:block pt-5" />

        <div className="px-4">
          {/* Equal-width columns (not intrinsic-width + fixed gap) so the
              three tabs sit evenly spaced regardless of label length —
              "Top Discussions" no longer crowds its neighbors. The active
              indicator is now one sliding bar (see below) instead of each
              button drawing its own border, so it can spring across to the
              new position instead of just appearing on a different tab. */}
          <div className="max-w-xl md:max-w-2xl mx-auto relative grid grid-cols-3 pb-1">
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

      <div className="max-w-xl md:max-w-2xl mx-auto px-5 pt-5">
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
            <ForYouTab
              key="for-you"
              interestId={interestId}
              justPostedId={justPostedId}
              scrollToPostId={scrollToPostId}
              active={visitedTabs[0]}
            />,
            <TopDiscussionsTab key="top" active={visitedTabs[1]} />,
            <FollowingTab key="following" active={visitedTabs[2]} />,
          ]}
        </SwipeableTabs>
      </div>

      <BottomNav />
    </div>
  );
}
