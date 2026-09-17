// src/components/ProjectMiniCard.tsx
import { Link } from "react-router-dom";
import { ImageIcon } from "lucide-react";
import { PROJECT_TYPE_LABELS, type Project } from "../hooks/useProjects";
import { getProjectPath } from "../lib/projectLinks";

// Compact, non-interactive project tile — for rails ("Similar
// projects", "Work samples") and, now, the profile's catch-all
// Projects tab, where a page full of the "detail" ProjectCard (buy/
// download/menu, full description) made a glance-and-tap grid
// impossible. Links via getProjectPath so a mini card always opens
// the same canonical page (pretty slug when the project has one) as
// everywhere else — the rail cards previously hard-coded
// /projects/:id and skipped the slug.
export function ProjectMiniCard({ project }: { project: Project }) {
  return (
    <Link
      to={getProjectPath(project)}
      className="group flex-shrink-0 w-36 bg-surface rounded-2xl overflow-hidden border border-border/60 shadow-[0_1px_2px_rgba(var(--shadow-ink-rgb),0.04),0_8px_20px_-12px_rgba(var(--shadow-ink-rgb),0.14)] transition-all duration-300 hover:shadow-[0_1px_2px_rgba(var(--shadow-ink-rgb),0.06),0_16px_32px_-14px_rgba(var(--shadow-ink-rgb),0.2)] hover:-translate-y-0.5"
    >
      <div className="w-full aspect-square bg-canvas flex items-center justify-center overflow-hidden">
        {project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <ImageIcon size={24} className="text-ink-muted" />
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-ink truncate">{project.title}</p>
        <p className="text-xs text-ink-muted mt-0.5">{PROJECT_TYPE_LABELS[project.project_type]}</p>
      </div>
    </Link>
  );
}

// Grid layout for a full tab's worth of mini cards (the profile's
// Projects tab) — as opposed to the horizontal-scroll rail the same
// card is used in elsewhere (ProjectRail in ProjectDetail).
export function ProjectMiniGrid({ projects }: { projects: Project[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {projects.map((project) => (
        <ProjectMiniCard key={project.id} project={project} />
      ))}
    </div>
  );
}
