// src/components/discover/DiscoverRail.tsx
//
// The building blocks of the structured Discover page: a titled, swipeable row of small
// tiles with a "More" door at both ends of the row — a link in the header (findable
// without scrolling) and a tile after the last item (where a swipe naturally ends).
//
// Sizing: tiles are ~104px wide on a phone, so three sit fully in view with the fourth
// peeking in — the peek is what tells people the row swipes. On wider screens they grow a
// little so a row shows four to five.
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, ImageIcon } from "lucide-react";
import { Avatar } from "../Avatar";
import { FileFolderIcon } from "../FileFolderArt";
import { VerifiedBadge } from "../VerifiedBadge";
import { thumbBoxAspectClass } from "../../lib/bookCover";
import { isFileType } from "../../lib/fileProject";
import { getProjectPath } from "../../lib/projectLinks";
import { discoverTileMeta, type DiscoverItem } from "../../hooks/useDiscoverBrowse";

const TILE_WIDTH = "w-[104px] sm:w-[120px]";
const AVATAR_TILE_WIDTH = "w-[84px] sm:w-[96px]";

export function DiscoverRail({
  title,
  moreTo,
  children,
}: {
  title: string;
  /** Where "More" goes. Omit when the row already shows everything there is. */
  moreTo?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-7" aria-label={title}>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg text-ink">{title}</h2>
        {moreTo && (
          <Link
            to={moreTo}
            aria-label={`More ${title}`}
            className="-mr-1 inline-flex min-h-[32px] items-center gap-0.5 px-1 text-sm font-medium text-accent"
          >
            More
            <ChevronRight size={16} />
          </Link>
        )}
      </div>
      {/* Bleeds to the screen edges so tiles slide off the page instead of being clipped at the margin. */}
      <div className="no-scrollbar -mx-4 snap-x snap-proximity overflow-x-auto overscroll-x-contain scroll-pl-4">
        <div className="flex w-max gap-3 px-4">{children}</div>
      </div>
    </section>
  );
}

/** One project: cover, title (two lines at most), and one muted line — a date or a price. */
export function DiscoverTile({ item, fluid = false }: { item: DiscoverItem; fluid?: boolean }) {
  const { project } = item;
  const meta = discoverTileMeta(item);
  return (
    <Link
      to={getProjectPath(project)}
      className={`group block min-w-0 ${fluid ? "w-full" : `shrink-0 snap-start ${TILE_WIDTH}`}`}
    >
      <div
        className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-surface ${thumbBoxAspectClass(project.project_type, "aspect-square")}`}
      >
        {isFileType(project.project_type) ? (
          <FileFolderIcon size={120} className="h-full w-full" />
        ) : project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <ImageIcon size={20} className="text-ink-muted" />
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug text-ink">{project.title}</p>
      {meta && <p className="mt-0.5 truncate text-[11px] text-ink-muted">{meta}</p>}
    </Link>
  );
}

/** The last tile of a row: same footprint as the others (cover-shaped for books), pointing at the full list. */
export function DiscoverMoreTile({ to, label, tall = false }: { to: string; label: string; tall?: boolean }) {
  return (
    <Link to={to} aria-label={`More ${label}`} className={`group block shrink-0 snap-start ${TILE_WIDTH}`}>
      <div
        className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface/60 text-accent transition-colors group-hover:border-accent/50 ${
          tall ? "aspect-[2/3]" : "aspect-square"
        }`}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft">
          <ArrowRight size={18} />
        </span>
        <span className="text-xs font-medium">More</span>
      </div>
    </Link>
  );
}

/** A person or a page: round avatar, name, one muted caption. */
export function DiscoverAvatarTile({
  to,
  name,
  avatarUrl,
  caption,
  verified = false,
}: {
  to: string;
  name: string;
  avatarUrl: string | null;
  caption?: string;
  verified?: boolean;
}) {
  return (
    <Link to={to} className={`flex shrink-0 snap-start flex-col items-center text-center ${AVATAR_TILE_WIDTH}`}>
      <Avatar src={avatarUrl} name={name} size="xl" />
      <span className="mt-1.5 flex max-w-full items-center justify-center gap-1">
        <span className="line-clamp-2 text-xs font-medium leading-snug text-ink">{name}</span>
        {verified && <VerifiedBadge className="shrink-0" />}
      </span>
      {caption && <span className="mt-0.5 max-w-full truncate text-[11px] text-ink-muted">{caption}</span>}
    </Link>
  );
}

/** Placeholder row while the first load runs — same footprint as a real row, so nothing jumps. */
export function DiscoverRailSkeleton() {
  return (
    <div className="mb-7" aria-hidden>
      <div className="mb-2.5 h-5 w-28 animate-pulse rounded bg-surface" />
      <div className="no-scrollbar -mx-4 overflow-hidden">
        <div className="flex w-max gap-3 px-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`shrink-0 ${TILE_WIDTH}`}>
              <div className="aspect-square w-full animate-pulse rounded-xl bg-surface" />
              <div className="mt-1.5 h-3 w-4/5 animate-pulse rounded bg-surface" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
