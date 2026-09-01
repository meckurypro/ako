// src/pages/HashtagFeed.tsx
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useHashtagPosts } from "../hooks/useHashtags";
import { PostCard } from "../components/PostCard";
import { BottomNav } from "../components/BottomNav";

export function HashtagFeed() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const { data: posts, isLoading } = useHashtagPosts(tag ?? "");

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-24">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h1 className="font-display text-xl text-ink">#{tag}</h1>
        </div>

        {isLoading ? (
          <p className="text-ink-muted text-sm">Loading…</p>
        ) : posts && posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <p className="text-ink-muted text-center py-10 text-sm">No posts with #{tag} yet.</p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
