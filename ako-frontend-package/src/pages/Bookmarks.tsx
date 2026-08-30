import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useBookmarkedPosts } from "../hooks/useBookmarks";
import { PostCard } from "../components/PostCard";
import { BottomNav } from "../components/BottomNav";

export function Bookmarks() {
  const navigate = useNavigate();
  const { data: posts, isLoading } = useBookmarkedPosts();

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-ink-muted">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-display text-2xl text-ink">Saved</h2>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-4">
        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !posts || posts.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">
            Nothing saved yet. Tap the bookmark icon on a post to keep it here.
          </p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>

      <BottomNav />
    </div>
  );
}
