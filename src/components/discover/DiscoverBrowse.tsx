// src/components/discover/DiscoverBrowse.tsx
//
// The Discover page body, identical for restricted and full accounts: one swipeable row per
// kind of content, then Pages. Full accounts additionally pass a `lead` (topic chips + people),
// rendered above the rows — restricted accounts never see people or posts, so it's simply absent.
//
// With `tags` selected, everything on the page narrows to what carries those tags (or strongly connected
// ones): the same rows, only matching projects, and matching pages. Nothing navigates away.
import type { ReactNode } from "react";
import { useSuggestedPages } from "../../hooks/useSearch";
import { useRelatedTags, useTagPages, type TagRef } from "../../hooks/useTags";
import { useDiscoverRails } from "../../hooks/useDiscoverBrowse";
import { pageModeLabel } from "../../lib/pageRoles";
import {
  DiscoverAvatarTile,
  DiscoverMoreTile,
  DiscoverRail,
  DiscoverRailSkeleton,
  DiscoverTile,
} from "./DiscoverRail";

// useSuggestedPages returns at most this many; reaching it means there are more to see.
const SUGGESTED_PAGES_CAP = 8;

export function DiscoverBrowse({
  lead,
  tags = [],
  onPickTag,
}: {
  lead?: ReactNode;
  tags?: TagRef[];
  /** Offered on the empty state: connected topics to try instead. */
  onPickTag?: (tag: TagRef) => void;
}) {
  const ids = tags.map((t) => t.id);
  const filtered = ids.length > 0;
  // "More" doors carry the filter along, so the full list is filtered too.
  const tagQuery = filtered ? `?tag=${tags.map((t) => t.slug).join(",")}` : "";

  const { rails, isLoading } = useDiscoverRails(ids);
  const suggestedPages = useSuggestedPages();
  const taggedPages = useTagPages(ids, SUGGESTED_PAGES_CAP);
  const { data: pages, isLoading: pagesLoading } = filtered ? taggedPages : suggestedPages;
  const related = useRelatedTags(filtered ? ids : [], 6);

  const loading = isLoading || pagesLoading;
  const hasPages = !!pages && pages.length > 0;
  const empty = !loading && rails.length === 0 && !hasPages;

  return (
    <div className="animate-ako-fade-up">
      {lead}

      {loading ? (
        <>
          <DiscoverRailSkeleton />
          <DiscoverRailSkeleton />
        </>
      ) : (
        <>
          {rails.map(({ section, items, hasMore }) => {
            const moreTo = `/topics/${section.key}${tagQuery}`;
            return (
              <DiscoverRail key={section.key} title={section.title} moreTo={hasMore ? moreTo : undefined}>
                {items.map((item) => (
                  <DiscoverTile key={item.project.id} item={item} />
                ))}
                {hasMore && <DiscoverMoreTile to={moreTo} label={section.title} projectType={section.type} />}
              </DiscoverRail>
            );
          })}

          {hasPages && (
            <DiscoverRail title="Pages" moreTo={pages!.length >= SUGGESTED_PAGES_CAP ? `/topics/pages${tagQuery}` : undefined}>
              {pages!.map((p) => (
                <DiscoverAvatarTile
                  key={p.id}
                  to={`/page/${p.username}`}
                  name={p.name}
                  avatarUrl={p.avatar_url}
                  caption={pageModeLabel(p.page_type)}
                  verified={p.is_verified}
                />
              ))}
              {pages!.length >= SUGGESTED_PAGES_CAP && <DiscoverMoreTile to={`/topics/pages${tagQuery}`} label="Pages" />}
            </DiscoverRail>
          )}

          {empty && !filtered && <p className="py-8 text-center text-sm text-ink-muted">Nothing to explore yet — check back soon.</p>}

          {empty && filtered && (
            <div className="py-8 text-center">
              <p className="text-sm text-ink-muted">
                Nothing tagged {tags.map((t) => t.name).join(" or ")} yet.
              </p>
              {onPickTag && (related.data ?? []).length > 0 && (
                <>
                  <p className="mt-4 mb-2 text-xs text-ink-muted">Try a connected topic</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {(related.data ?? []).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onPickTag(t)}
                        className="px-3.5 py-2 rounded-full text-sm bg-surface text-ink border border-border hover:border-accent/50 transition-colors"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
