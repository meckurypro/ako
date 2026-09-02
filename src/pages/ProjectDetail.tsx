// src/pages/ProjectDetail.tsx
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { useProjectDetail, useSimilarProjects, PROJECT_TYPE_LABELS, type Project } from "../hooks/useProjects";
import { Avatar } from "../components/Avatar";
import { TierBadge } from "../components/TierBadge";
import { RoleTags } from "../components/RoleTags";
import { ProjectCard } from "../components/ProjectCard";

// Compact, non-interactive project tile for the "similar projects"
// rails — just enough to identify it and tap through. The full
// ProjectCard (buy/download/menu) is reserved for the one project
// this page is actually about
function ProjectMiniCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex-shrink-0 w-36 bg-surface rounded-xl overflow-hidden border border-border"
    >
      <div className="w-full aspect-square bg-canvas flex items-center justify-center">
        {project.thumbnail_url ? (
          <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={24} className="text-ink-muted" />
        )}
      </div>
      <div className="p-2.5">
        <p className="text-sm text-ink truncate">{project.title}</p>
        <p className="text-xs text-ink-muted">{PROJECT_TYPE_LABELS[project.project_type]}</p>
      </div>
    </Link>
  );
}

function ProjectRail({ title, projects }: { title: string; projects: Project[] }) {
  if (projects.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="font-display text-base text-ink mb-3">{title}</h3>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
        {projects.map((p) => (
          <ProjectMiniCard key={p.id} project={p} />
        ))}
      </div>
    </div>
  );
}

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProjectDetail(projectId);
  const { data: similar } = useSimilarProjects(project);

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-24">
      <div className="max-w-xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-ink-muted mb-3">
          <ArrowLeft size={22} />
        </button>

        {isLoading || !project ? (
          <p className="text-ink-muted">Loading…</p>
        ) : (
          <>
            <ProjectCard project={project} />

            {project.topics.length > 0 && (
              <div className="flex flex-wrap gap-2 -mt-2 mb-4">
                {project.topics.map((topic) => (
                  <span
                    key={topic.id}
                    className="text-xs font-medium px-2.5 py-1 rounded-full bg-surface border border-border text-ink-muted"
                  >
                    {topic.name}
                  </span>
                ))}
              </div>
            )}

            {/* Creator byline — tapping any part of it opens the
                creator's profile, per the "fanlink" behavior. */}
            <Link
              to={`/profile/${project.owner.username}`}
              className="flex items-center gap-3 bg-surface rounded-2xl border border-border p-4"
            >
              <Avatar src={project.owner.avatar_url} name={project.owner.display_name} size="lg" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-ink">{project.owner.display_name}</span>
                  <TierBadge tier={project.owner.tier} />
                </div>
                {project.owner.roles.length > 0 && (
                  <RoleTags roles={project.owner.roles} className="text-xs text-ink-muted block mt-0.5" />
                )}
                <span className="text-sm text-ink-muted">@{project.owner.username}</span>
              </div>
            </Link>

            <ProjectRail title={`More from ${project.owner.display_name}`} projects={similar?.moreFromCreator ?? []} />
            <ProjectRail title="Similar topics" projects={similar?.moreOnTopic ?? []} />
            <ProjectRail
              title={`More ${PROJECT_TYPE_LABELS[project.project_type]}s`}
              projects={similar?.moreOfType ?? []}
            />
          </>
        )}
      </div>
    </div>
  );
}
