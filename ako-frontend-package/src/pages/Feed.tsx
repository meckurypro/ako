import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PlusCircle, X } from "lucide-react";
import { useFeedPosts } from "../hooks/usePosts";
import { PostCard } from "../components/PostCard";
import { BottomNav } from "../components/BottomNav";
import { TopHeader } from "../components/TopHeader";
import type { PostWithAuthor } from "../types/database";

export function Feed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const interestId = searchParams.get("interest") ?? undefined;

  const [page, setPage] = useState(0);
  const [allPosts, setAllPosts] = useState<PostWithAuthor[]>([]);
  const { data: pagePosts, isLoading, error } = useFeedPosts(interestId, page);

  // Reset pagination whenever the topic filter changes
  useEffect(() => {
    setPage(0);
    setAllPosts([]);
  }, [interestId]);

  // Accumulate each page's results rather than replacing — "Load more"
  // should append, not swap out what's already on screen.
  useEffect(() => {
    if (!pagePosts) return;
    setAllPosts((prev) => (page === 0 ? pagePosts : [...prev, ...pagePosts]));
  }, [pagePosts, page]);

  const posts = allPosts;

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <TopHeader showTagline />

      <div className="max-w-xl mx-auto px-4 pt-4">
        {interestId && (
          <button
            onClick={() => setSearchParams({})}
            className="flex items-center gap-1.5 text-sm text-accent bg-accent-soft rounded-full px-3 py-1.5 mb-4 w-fit"
          >
            Filtered by topic
            <X size={14} />
          </button>
        )}

        {isLoading && page === 0 ? (
          <p className="text-ink-muted text-center py-10">Loading your feed…</p>
        ) : error ? (
          <p className="text-danger text-center py-10">Couldn't load the feed. Try again.</p>
        ) : posts && posts.length === 0 && page === 0 ? (
          <div className="text-center py-16">
            <p className="text-ink-muted mb-4">No posts yet. Be the first to share a thought.</p>
            <Link
              to="/compose"
              className="inline-block bg-accent text-canvas px-5 py-2.5 rounded-full text-sm font-medium"
            >
              Write something
            </Link>
          </div>
        ) : (
          <>
            {posts?.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {posts && posts.length > 0 && (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="w-full text-sm text-accent font-medium py-3 mb-4"
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>

      <Link
        to="/compose"
        className="fixed bottom-20 right-5 bg-accent text-canvas rounded-full p-3.5 shadow-lg z-40"
        aria-label="New post"
      >
        <PlusCircle size={24} />
      </Link>

      <BottomNav />
    </div>
  );
}
