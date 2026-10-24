// src/components/TaggedProjectEmbed.tsx
import { isBookType } from "../lib/bookCover";
import { Link } from "react-router-dom";
import { ImageIcon, Music2 } from "lucide-react";
import { type ProjectType } from "../hooks/useProjects";
import { getProjectPath } from "../lib/projectLinks";
import { affiliateLinkFor } from "../hooks/useAffiliates";
import { isFileType } from "../lib/fileProject";
import { FileFolderIcon } from "./FileFolderArt";

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
 * Thumbnail: oversized and perspective-tilted (a card resting on the strip), while the strip itself is just
 * tall enough for the title plus padding.
 *
 * Price is intentionally never rendered here (see item 5) — the tag
 * is meant to surface the project, not its price; price only shows
 * once the viewer opens the project itself.
 */
export function TaggedProjectEmbed({
  project,
  refToken,
}: {
  project: TaggedProjectSummary | null | undefined;
  // Set when the poster tagged a project they forked: the link carries their affiliate ref.
  refToken?: string | null;
}) {
  if (!project) return null;

  if (project.status !== "active") {
    return (
      <div className="mt-3 rounded-xl border border-border/60 bg-surface/70 backdrop-blur-sm px-3.5 py-2.5 text-sm text-ink-muted">
        This tagged project is no longer available.
      </div>
    );
  }

  // The strip is only as tall as the title needs; the thumbnail is deliberately oversized, overflows it above
  // and below, and is tilted in perspective like a physical card resting on the post. The link's own height
  // reserves the overflow so nothing above or below is overlapped.
  const book = isBookType(project.project_type);
  // A song (a "media" project) gets a record instead of a tilted card: same box, same spot, but round.
  const song = project.project_type === "media";
  const thumbW = book ? 84 : 96;
  const thumbH = book ? 120 : 96;

  return (
    <Link
      to={refToken ? affiliateLinkFor(getProjectPath(project), refToken) : getProjectPath(project)}
      onClick={(e) => e.stopPropagation()}
      className="group relative mt-3 flex items-center"
      style={{ height: thumbH + 8 }}
    >
      <div
        className="flex w-full min-h-[60px] items-center justify-center rounded-xl border border-white/10 bg-surface/60 backdrop-blur-sm py-2 pr-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_1px_2px_rgba(var(--shadow-ink-rgb),0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_2px_rgba(var(--shadow-ink-rgb),0.24)] group-hover:bg-surface/80 transition-colors"
        style={{ paddingLeft: thumbW + 24 }}
      >
        {/* Bold, centred, two lines max. */}
        <p className="text-base font-bold leading-[21px] text-ink text-center line-clamp-2 break-words">{project.title}</p>
      </div>

      {song ? (
        // Record: the cover fills a circle, fine grooves and a dark rim sit over it, and a spindle hole marks the
        // centre. Flat (no perspective tilt) so it reads as a disc lying on the post; a hair of rotation keeps it
        // from looking stamped.
        <div
          className="absolute left-3 top-1/2 overflow-hidden rounded-full bg-neutral-900 flex items-center justify-center pointer-events-none"
          style={{
            width: thumbW,
            height: thumbH,
            transform: "translateY(-50%) rotate(-8deg)",
            boxShadow:
              "0 0 0 2px rgba(20,20,20,0.9), 0 12px 18px -8px rgba(var(--shadow-ink-rgb),0.5), 0 2px 5px rgba(var(--shadow-ink-rgb),0.28)",
          }}
        >
          {project.thumbnail_url ? (
            <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Music2 size={24} className="text-white/70" />
          )}
          {/* Grooves + a soft diagonal sheen. */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "repeating-radial-gradient(circle at center, rgba(0,0,0,0) 0 3px, rgba(0,0,0,0.16) 3px 4px), linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.12) 100%)",
            }}
          />
          {/* Spindle hole. */}
          <div
            className="absolute rounded-full bg-surface"
            style={{
              width: thumbW * 0.16,
              height: thumbW * 0.16,
              boxShadow: "0 0 0 3px rgba(20,20,20,0.75), inset 0 1px 2px rgba(0,0,0,0.35)",
            }}
          />
        </div>
      ) : (
        <div
          className="absolute left-3 top-1/2 overflow-hidden rounded-lg border border-white/25 bg-surface flex items-center justify-center pointer-events-none"
          style={{
            width: thumbW,
            height: thumbH,
            transform: "translateY(-50%) perspective(600px) rotateY(16deg) rotateX(4deg) rotate(-6deg)",
            boxShadow: "0 12px 18px -8px rgba(var(--shadow-ink-rgb),0.5), 0 2px 5px rgba(var(--shadow-ink-rgb),0.28)",
          }}
        >
          {isFileType(project.project_type) ? (
            <FileFolderIcon size={thumbW} className="w-full h-full" />
          ) : project.thumbnail_url ? (
            <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={22} className="text-ink-muted" />
          )}
        </div>
      )}
    </Link>
  );
}
