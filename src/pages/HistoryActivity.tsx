// src/pages/HistoryActivity.tsx
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ImageIcon, History as HistoryIcon, FileText } from "lucide-react";
import { useViewHistory, type HistoryItem } from "../hooks/useViewHistory";
import { BottomNav } from "../components/BottomNav";

// Compact rows rather than full PostCard/ProjectCard — History reads
// more like a browsing log (what, when) than a feed, so it's kept
// visually distinct from the full-card Saved/Liked tabs.
function HistoryRow({ item }: { item: HistoryItem }) {
  const isPost = item.kind === "post";
  const to = isPost ? `/post/${item.post.id}` : `/projects/${item.project.id}`;
  const title = isPost
    ? item.post.heading || item.post.content?.slice(0, 80) || "Post"
    : item.project.title;
  const thumbnail = isPost ? null : item.project.thumbnail_url;
  const subtitle = isPost
    ? `Post by ${item.post.author?.display_name ?? "someone"}`
    : "Project";

  return (
    <Link to={to} className="flex items-center gap-3 py-3 border-b border-border">
      <div className="w-11 h-11 rounded-lg bg-surface flex items-center justify-center overflow-hidden shrink-0">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        ) : isPost ? (
          <FileText size={16} className="text-ink-muted" />
        ) : (
          <ImageIcon size={16} className="text-ink-muted" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink truncate">{title}</p>
        <p className="text-xs text-ink-muted">{subtitle}</p>
      </div>
      <span className="text-xs text-ink-muted shrink-0">
        {new Date(item.viewedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </span>
    </Link>
  );
}

export function HistoryActivity() {
  const navigate = useNavigate();
  const { data: items, isLoading } = useViewHistory();

  return (
    <div className="min-h-screen bg-canvas px-4 pt-6 pb-24">
      <div className="max-w-xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-ink-muted mb-4">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-display text-2xl text-ink mb-6">History</h2>

        {isLoading ? (
          <p className="text-ink-muted text-sm">Loading…</p>
        ) : !items || items.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-2 mt-16 text-ink-muted">
            <HistoryIcon size={24} />
            <p className="text-sm max-w-xs">
              Posts and projects you open will show up here, most recent first.
            </p>
          </div>
        ) : (
          <div>
            {items.map((item) => (
              <HistoryRow key={`${item.kind}-${item.post?.id ?? item.project?.id}-${item.viewedAt}`} item={item} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
