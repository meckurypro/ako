// src/pages/SavedHub.tsx
import { useState, type TouchEvent, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTabState } from "../hooks/useTabState";
import { useBookmarkedPosts } from "../hooks/useBookmarks";
import { useSavedProjects } from "../hooks/useSavedProjects";
import { PostCard } from "../components/PostCard";
import { ProjectCard } from "../components/ProjectCard";
import { BottomNav } from "../components/BottomNav";

const TABS = ["posts", "projects"] as const;
type Tab = (typeof TABS)[number];
const SWIPE_THRESHOLD_PX = 50;

// Replaces the old standalone Bookmarks.tsx / SavedProjects.tsx pages
// with one tabbed view inside the Activity hub — saved posts and
// saved projects side by side instead of two separate destinations.
// Tab switching (click or swipe) matches Feed's and ProfilePage's tab
// rows exactly: URL-backed state, a sliding underline, and the same
// smooth spring-in on the content (see .animate-tab-spring, .ako-tab-
// indicator in index.css).
export function SavedHub() {
  const navigate = useNavigate();
  const [tab, setTab] = useTabState<Tab>(TABS, "posts");
  const [tabDirection, setTabDirection] = useState(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const { data: posts, isLoading: postsLoading } = useBookmarkedPosts();
  const { data: projects, isLoading: projectsLoading } = useSavedProjects();

  const activeIndex = TABS.indexOf(tab);

  function goToIndex(index: number) {
    const clamped = Math.max(0, Math.min(TABS.length - 1, index));
    if (clamped === activeIndex) return;
    setTabDirection(clamped > activeIndex ? 1 : -1);
    setTab(TABS[clamped]);
  }

  function handleTabClick(index: number, next: Tab) {
    if (index === activeIndex) return;
    setTabDirection(index > activeIndex ? 1 : -1);
    setTab(next);
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

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    if (deltaX < 0) {
      goToIndex(activeIndex + 1);
    } else {
      goToIndex(activeIndex - 1);
    }
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-ink-muted">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-display text-2xl text-ink">Saved</h2>
      </header>

      <div className="max-w-xl mx-auto px-4">
        <div className="relative flex items-stretch mt-4 border-b border-border">
          <button
            onClick={() => handleTabClick(0, "posts")}
            className={`flex-1 text-center text-sm font-medium pb-3 ${
              tab === "posts" ? "text-accent" : "text-ink-muted"
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => handleTabClick(1, "projects")}
            className={`flex-1 text-center text-sm font-medium pb-3 ${
              tab === "projects" ? "text-accent" : "text-ink-muted"
            }`}
          >
            Projects
          </button>
          <div
            className="ako-tab-indicator absolute bottom-0 left-0 h-[2px] w-1/2 bg-accent rounded-full"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          />
        </div>

        <div className="pt-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div key={tab} className="animate-tab-spring" style={{ "--tab-dir": tabDirection } as CSSProperties}>
            {tab === "posts" ? (
              postsLoading ? (
                <p className="text-ink-muted text-center py-10">Loading…</p>
              ) : !posts || posts.length === 0 ? (
                <p className="text-ink-muted text-center py-10 text-sm">
                  Nothing saved yet. Tap the bookmark icon on a post to keep it here.
                </p>
              ) : (
                posts.map((post) => <PostCard key={post.id} post={post} />)
              )
            ) : projectsLoading ? (
              <p className="text-ink-muted text-center py-10">Loading…</p>
            ) : !projects || projects.length === 0 ? (
              <p className="text-ink-muted text-center py-10 text-sm">
                Nothing saved yet. Tap the bookmark icon on a project to keep it here.
              </p>
            ) : (
              projects.map((project) => <ProjectCard key={project.id} project={project} />)
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
