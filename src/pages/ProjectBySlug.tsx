// src/pages/ProjectBySlug.tsx
import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useResolveProjectSlug } from "../hooks/useProjects";
import { getProjectPath, normalizeProjectSlug } from "../lib/projectLinks";
import { ProjectDetail } from "./ProjectDetail";

/**
 * Mounted at the flat /:slug route (see App.tsx, listed after every
 * other top-level route so it only catches what nothing else
 * claimed). Not a second URL system alongside /projects/:id — it's
 * the human-readable front door to the exact same page. ProjectDetail
 * already renders any project_type generically, so this dispatcher
 * doesn't need to know about project types at all; a new type gets a
 * working public link the moment it has a slug, with nothing to add
 * here.
 */
export function ProjectBySlug() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading, isError, refetch } = useResolveProjectSlug(slug);
  const { user } = useAuth();

  // A retired slug still resolves (to its project's current one) —
  // see resolve_project_slug. When that's what happened, swap the
  // address bar to the up-to-date link rather than silently serving
  // old-slug content at a URL that no longer matches it.
  const isStaleSlug = !!project && !!slug && normalizeProjectSlug(project.slug ?? "") !== normalizeProjectSlug(slug);

  useEffect(() => {
    if (project && isStaleSlug) {
      navigate(getProjectPath(project), { replace: true });
    }
  }, [project, isStaleSlug, navigate]);

  // Tab title = the project's, so a shared link reads properly in tabs/history.
  useEffect(() => {
    if (!project || isStaleSlug) return;
    const previous = document.title;
    document.title = `${project.title} · Akọ`;
    return () => {
      document.title = previous;
    };
  }, [project, isStaleSlug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas px-4 pt-4 pb-24">
        <div className="max-w-xl mx-auto">
          <p className="text-ink-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (isStaleSlug) return null;

  if (isError) {
    return (
      <div className="min-h-screen bg-canvas px-4 pt-16 pb-24">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="font-display text-xl font-semibold text-ink">Couldn't load this page</h1>
          <p className="text-sm text-ink-muted mt-2">Check your connection and try again.</p>
          <button onClick={() => void refetch()} className="mt-5 text-accent text-sm font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-canvas px-4 pt-16 pb-24">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="font-display text-xl font-semibold text-ink">This project couldn't be found</h1>
          <p className="text-sm text-ink-muted mt-2">The link may have changed, or the project is no longer available.</p>
          <Link to={user ? "/feed" : "/login"} className="inline-block mt-5 text-accent text-sm font-medium">
            {user ? "Go to your feed" : "Log in"}
          </Link>
        </div>
      </div>
    );
  }

  return <ProjectDetail resolvedProjectId={project.id} />;
}
