// msrc/pages/LikedHub.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTabState } from "../hooks/useTabState";
import { useLikedPosts, useLikedProjects } from "../hooks/useReactions";
import { PostCard } from "../components/PostCard";
import { ProjectCard } from "../components/ProjectCard";
import { BottomNav } from "../components/BottomNav";
import { SwipeableTabs } from "../components/SwipeableTabs";

const TABS = ["posts", "projects"] as const;
type Tab = (typeof TABS)[number];

// Same shape as SavedHub — liked posts and liked projects side by
// side inside the Activity hub, with the same click/swipe tab
// mechanics (URL-backed state, sliding underline, real drag-tracking
// carousel — see SwipeableTabs.tsx).
export function LikedHub() {
  const navigate = useNavigate();
  const [tab, setTab] = useTabState<Tab>(TABS, "posts");
  const activeIndex = TABS.indexOf(tab);
  // Continuous tab position fed by SwipeableTabs' onProgress, so the
  // sliding indicator bar tracks the finger during a drag instead of
  // only jumping once the swipe commits.
  const [tabProgress, setTabProgress] = useState(activeIndex);
  const [tabDragging, setTabDragging] = useState(false);

  const { data: posts, isLoading: postsLoading } = useLikedPosts();
  const { data: projects, isLoading: projectsLoading } = useLikedProjects();

  function handleTabClick(index: number, next: Tab) {
    if (index === activeIndex) return;
    setTab(next);
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-ink-muted">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-display text-2xl text-ink">Liked</h2>
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
            className={`ako-tab-indicator absolute bottom-0 left-0 h-[2px] w-1/2 bg-accent rounded-full ${
              tabDragging ? "ako-tab-indicator--dragging" : ""
            }`}
            style={{ transform: `translateX(${tabProgress * 100}%)` }}
          />
        </div>

        <div className="pt-4">
          <SwipeableTabs
            index={activeIndex}
            onIndexChange={(i) => setTab(TABS[i])}
            onProgress={(progress, dragging) => {
              setTabProgress(progress);
              setTabDragging(dragging);
            }}
          >
            {[
              <div key="posts">
                {postsLoading ? (
                  <p className="text-ink-muted text-center py-10">Loading…</p>
                ) : !posts || posts.length === 0 ? (
                  <p className="text-ink-muted text-center py-10 text-sm">
                    Posts you like will show up here.
                  </p>
                ) : (
                  posts.map((post: any) => <PostCard key={post.id} post={post} />)
                )}
              </div>,
              <div key="projects">
                {projectsLoading ? (
                  <p className="text-ink-muted text-center py-10">Loading…</p>
                ) : !projects || projects.length === 0 ? (
                  <p className="text-ink-muted text-center py-10 text-sm">
                    Projects you like will show up here.
                  </p>
                ) : (
                  projects.map((project: any) => <ProjectCard key={project.id} project={project} />)
                )}
              </div>,
            ]}
          </SwipeableTabs>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
