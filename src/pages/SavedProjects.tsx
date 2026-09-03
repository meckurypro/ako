// src/pages/SavedProjects.tsx
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bookmark } from "lucide-react";
import { useSavedProjects } from "../hooks/useSavedProjects";
import { ProjectCard } from "../components/ProjectCard";

export function SavedProjects() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useSavedProjects();

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-ink-muted mb-4">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-6">Saved projects</h2>

        {isLoading ? (
          <p className="text-ink-muted text-sm">Loading…</p>
        ) : (projects ?? []).length === 0 ? (
          <div className="flex flex-col items-center text-center gap-2 mt-16 text-ink-muted">
            <Bookmark size={24} />
            <p className="text-sm">Projects you save will show up here.</p>
          </div>
        ) : (
          projects!.map((project) => <ProjectCard key={project.id} project={project} />)
        )}
      </div>
    </div>
  );
}
