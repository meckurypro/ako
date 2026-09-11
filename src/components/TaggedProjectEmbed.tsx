// src/components/TaggedProjectEmbed.tsx
import { Link } from "react-router-dom";
import { ImageIcon } from "lucide-react";
import { PROJECT_TYPE_LABELS, getEffectivePrice, isProjectFree, type ProjectType } from "../hooks/useProjects";

export interface TaggedProjectSummary {
  id: string;
  title: string;
  thumbnail_url: string | null;
  project_type: ProjectType;
  price_usd: number;
  promo_price_usd: number | null;
  status: "active" | "draft" | "archived" | "cancelled";
  owner: {
    username: string;
    display_name: string;
  };
}

/**
 * Item 10: "subtly tagging a project in a post... at the bottom of the
 * post with its thumbnail (smaller), title, and creator name."
 * Deliberately the smallest of the embed patterns in this file set —
 * mirrors RepostEmbed.tsx's card-with-a-border shape, but a fixed
 * small square thumbnail instead of a full-width preview, since this
 * is meant to read as a subtle mention, not a second post-within-a-
 * post the way a reshare/quote is.
 *
 * `project` is null when it can no longer be fetched (id lingers on
 * the post row after the project itself was deleted — there's no
 * project-side "is_deleted" flag the way posts have, so a missing
 * project is the only signal). A non-null project with
 * status !== 'active' (unpublished draft, archived) still shouldn't
 * link out to something the viewer can't actually see.
 */
export function TaggedProjectEmbed({ project }: { project: TaggedProjectSummary | null | undefined }) {
  if (!project) return null;

  if (project.status !== "active") {
    return (
      <div className="mt-3 rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink-muted">
        This tagged project is no longer available.
      </div>
    );
  }

  const free = isProjectFree(project);
  const price = getEffectivePrice(project);

  return (
    <Link
      to={`/projects/${project.id}`}
      onClick={(e) => e.stopPropagation()}
      className="mt-3 flex items-center gap-2.5 rounded-xl border border-border bg-canvas px-2.5 py-2 hover:bg-canvas/80 transition-colors"
    >
      <div className="w-11 h-11 rounded-lg overflow-hidden bg-surface border border-border flex-shrink-0 flex items-center justify-center">
        {project.thumbnail_url ? (
          <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={16} className="text-ink-muted" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-ink-muted font-medium">
          {PROJECT_TYPE_LABELS[project.project_type]} · {project.owner.display_name}
        </p>
        <p className="text-sm font-medium text-ink truncate">{project.title}</p>
      </div>
      <span className="text-xs font-semibold text-ink-muted flex-shrink-0">
        {free ? "Free" : `$${price.toFixed(2)}`}
      </span>
    </Link>
  );
}
