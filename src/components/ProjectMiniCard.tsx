// src/components/ProjectMiniCard.tsx
import { thumbBoxAspectClass } from "../lib/bookCover";
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
//
// The Link is `block`: an <a> is inline by default, which silently
// ignores w-36, so inside the rail's shrink-to-fit wrapper a large
// cover image set the card's width and one tile rendered oversized.
export function ProjectMiniCard({
  project,
  showStatus = false,
  fluid = false,
}: {
  project: Project;
  /** Label Draft / Private on the tile — for a team viewing its own
   *  work-in-progress, where those states matter. Off for public grids. */
  showStatus?: boolean;
  /** Fill the grid cell instead of the fixed rail width (w-36). Grids pass this so tiles span the full row. */
  fluid?: boolean;
}) {
  const statusLabel = !showStatus
    ? null
    : project.status === "draft"
      ? "Draft"
      : project.status === "cancelled"
        ? "Cancelled"
        : project.is_private
          ? "Private"
          : null;
  return (
    <Link
      to={getProjectPath(project)}
      className={`group block min-w-0 bg-surface ${fluid ? "w-full" : "flex-shrink-0 w-36"} rounded-2xl overflow-hidden border border-border/60 shadow-[0_1px_2px_rgba(var(--shadow-ink-rgb),0.04),0_8px_20px_-12px_rgba(var(--shadow-ink-rgb),0.14)] transition-all duration-300 hover:shadow-[0_1px_2px_rgba(var(--shadow-ink-rgb),0.06),0_16px_32px_-14px_rgba(var(--shadow-ink-rgb),0.2)] hover:-translate-y-0.5`}
    >
      <div className={`relative w-full ${thumbBoxAspectClass(project.project_type, "aspect-square")} bg-canvas flex items-center justify-center overflow-hidden`}>
        {statusLabel && (
          <span className="absolute top-2 left-2 z-10 rounded-full bg-ink/75 text-canvas text-[11px] font-medium px-2 py-0.5">
            {statusLabel}
          </span>
        )}
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
      <div className={fluid ? "px-4 pt-3.5 pb-4" : "p-3"}>
        <p className={`${fluid ? "text-[15px]" : "text-sm"} font-medium text-ink truncate`}>{project.title}</p>
        <p className={`${fluid ? "text-[13px] mt-1" : "text-xs mt-0.5"} text-ink-muted`}>{PROJECT_TYPE_LABELS[project.project_type]}</p>
      </div>
    </Link>
  );
}

// Grid layout for a full tab's worth of mini cards (the profile's
// Projects tab) — as opposed to the horizontal-scroll rail the same
// card is used in elsewhere (ProjectRail in ProjectDetail).
export function ProjectMiniGrid({ projects, showStatus = false }: { projects: Project[]; showStatus?: boolean }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-start">
      {projects.map((project) => (
        <ProjectMiniCard key={project.id} project={project} showStatus={showStatus} fluid />
      ))}
    </div>
  );
}
