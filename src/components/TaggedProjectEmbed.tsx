// src/components/TaggedProjectEmbed.tsx
import { Link } from "react-router-dom";
import { ImageIcon } from "lucide-react";
import { type ProjectType } from "../hooks/useProjects";
import { getProjectPath } from "../lib/projectLinks";

export interface TaggedProjectSummary {
  id: string;
  title: string;
  thumbnail_url: string | null;
  project_type: ProjectType;
  price_usd: number;
  promo_price_usd: number | null;
  status: "active" | "draft" | "archived" | "cancelled";
  slug?: string | null;
  posted_as_page?: { username: string } | null;
  owner: {
    username: string;
    display_name: string;
  };
}

/**
 * Item 10: "subtly tagging a project in a post... at the bottom of the
 * post with its thumbnail (smaller) and title." Deliberately the
 * smallest of the embed patterns in this file set — mirrors
 * RepostEmbed.tsx's card-with-a-border shape, but a fixed small square
 * thumbnail instead of a full-width preview, since this is meant to
 * read as a subtle mention, not a second post-within-a-post the way a
 * reshare/quote is. No type/creator eyebrow line — the post's own
 * header above already says who posted it, so repeating it here read
 * as clutter on an element meant to stay understated.
 *
 * `project` is null when it can no longer be fetched (id lingers on
 * the post row after the project itself was deleted — there's no
 * project-side "is_deleted" flag the way posts have, so a missing
 * project is the only signal). A non-null project with
 * status !== 'active' (unpublished draft, archived) still shouldn't
 * link out to something the viewer can't actually see.
 *
 * Styling: the embed used to sit on `bg-canvas`, which is a visibly
 * darker/duller tone than the post card's own `bg-surface` — it read
 * as a separate, heavier box glued to the bottom of the post instead
 * of belonging to it. Now it stays on-surface (near-identical to the
 * card behind it) and gets its lift from translucency + blur (a soft
 * glass layer) plus a hairline inset highlight and a barely-there
 * offset shadow (the "3d" cue), so it reads as one raised layer of
 * the same post rather than a different-colored card.
 *
 * Price is intentionally never rendered here (see item 5) — the tag
 * is meant to surface the project, not its price; price only shows
 * once the viewer opens the project itself.
 */
export function TaggedProjectEmbed({ project }: { project: TaggedProjectSummary | null | undefined }) {
  if (!project) return null;

  if (project.status !== "active") {
    return (
      <div className="mt-3 rounded-xl border border-border/60 bg-surface/70 backdrop-blur-sm px-3.5 py-2.5 text-sm text-ink-muted">
        This tagged project is no longer available.
      </div>
    );
  }

  return (
    <Link
      to={getProjectPath(project)}
      onClick={(e) => e.stopPropagation()}
      className="mt-3 flex items-center gap-2.5 rounded-xl border border-white/10 bg-surface/60 backdrop-blur-sm px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_1px_2px_rgba(var(--shadow-ink-rgb),0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_2px_rgba(var(--shadow-ink-rgb),0.24)] hover:bg-surface/80 transition-colors"
    >
      <div className="w-11 h-11 rounded-lg overflow-hidden bg-surface/80 border border-border/50 flex-shrink-0 flex items-center justify-center">
        {project.thumbnail_url ? (
          <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={16} className="text-ink-muted" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink truncate">{project.title}</p>
      </div>
    </Link>
  );
}
