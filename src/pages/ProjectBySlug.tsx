// src/pages/ProjectBySlug.tsx
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useResolveProjectSlug, useProjectSlugHolder } from "../hooks/useProjects";
import { getProjectPath, normalizeProjectSlug, type ProjectSlugHolderType } from "../lib/projectLinks";
import { ProjectDetail } from "./ProjectDetail";

/**
 * Mounted at /profile/:username/:slug and /page/:username/:slug (see
 * App.tsx). Not a second URL system alongside /projects/:id — it's
 * the human-readable front door to the exact same page. ProjectDetail
 * already renders any project_type generically, so this dispatcher
 * doesn't need to know about project types at all; a new type gets a
 * working public link the moment it has a slug, with nothing to add
 * here.
 */
export function ProjectBySlug({ holderType }: { holderType: ProjectSlugHolderType }) {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading, isError } = useResolveProjectSlug(holderType, username, slug);
  const { data: holder } = useProjectSlugHolder(project ?? undefined);

  // A retired slug still resolves (to its project's current one) —
  // see resolve_project_slug. When that's what happened, swap the
  // address bar to the up-to-date link rather than silently serving
  // old-slug content at a URL that no longer matches it.
  const isStaleSlug = !!project && !!slug && normalizeProjectSlug(project.slug ?? "") !== normalizeProjectSlug(slug);

  useEffect(() => {
    if (project && isStaleSlug && holder) {
      navigate(getProjectPath(project, holder), { replace: true });
    }
  }, [project, isStaleSlug, holder, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas px-4 pt-4 pb-24">
        <div className="max-w-xl mx-auto">
          <p className="text-ink-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (isError || !project || isStaleSlug) {
    // isStaleSlug renders nothing here — the effect above is already
    // navigating away to the right place.
    if (isStaleSlug) return null;
    return (
      <div className="min-h-screen bg-canvas px-4 pt-4 pb-24">
        <div className="max-w-xl mx-auto">
          <p className="text-ink-muted">This project couldn't be found.</p>
        </div>
      </div>
    );
  }

  return <ProjectDetail resolvedProjectId={project.id} />;
}
