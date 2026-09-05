// src/pages/LikedHub.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLikedPosts, useLikedProjects } from "../hooks/useReactions";
import { PostCard } from "../components/PostCard";
import { ProjectCard } from "../components/ProjectCard";
import { BottomNav } from "../components/BottomNav";

type Tab = "posts" | "projects";

// Same shape as SavedHub — liked posts and liked projects side by
// side inside the Activity hub.
export function LikedHub() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("posts");
  const { data: posts, isLoading: postsLoading } = useLikedPosts();
  const { data: projects, isLoading: projectsLoading } = useLikedProjects();

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-ink-muted">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-display text-2xl text-ink">Liked</h2>
      </header>

      <div className="max-w-xl mx-auto px-4">
        <div className="flex items-stretch mt-4 border-b border-border">
          <button
            onClick={() => setTab("posts")}
            className={`flex-1 text-center text-sm font-medium pb-3 border-b-2 -mb-px ${
              tab === "posts" ? "text-accent border-accent" : "text-ink-muted border-transparent"
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setTab("projects")}
            className={`flex-1 text-center text-sm font-medium pb-3 border-b-2 -mb-px ${
              tab === "projects" ? "text-accent border-accent" : "text-ink-muted border-transparent"
            }`}
          >
            Projects
          </button>
        </div>

        <div className="pt-4">
          {tab === "posts" ? (
            postsLoading ? (
              <p className="text-ink-muted text-center py-10">Loading…</p>
            ) : !posts || posts.length === 0 ? (
              <p className="text-ink-muted text-center py-10 text-sm">
                Posts you like will show up here.
              </p>
            ) : (
              posts.map((post: any) => <PostCard key={post.id} post={post} />)
            )
          ) : projectsLoading ? (
            <p className="text-ink-muted text-center py-10">Loading…</p>
          ) : !projects || projects.length === 0 ? (
            <p className="text-ink-muted text-center py-10 text-sm">
              Projects you like will show up here.
            </p>
          ) : (
            projects.map((project: any) => <ProjectCard key={project.id} project={project} />)
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
