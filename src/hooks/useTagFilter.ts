// src/hooks/useTagFilter.ts
//
// Which tags the Discover page (and its "More" screens) are filtered by. The URL is the source of truth
// (?tag=generative-ai,startups — slugs, so links read well and survive reinstalls), which means Back/Forward
// and deep links just work. Tapping a chip replaces the history entry instead of stacking a new one.
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTagsBySlug, type TagRef } from "./useTags";

const MAX_TAGS = 5;

export function useTagFilter() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();

  const raw = params.get("tag") ?? "";
  const slugs = useMemo(
    () => Array.from(new Set(raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))).slice(0, MAX_TAGS),
    [raw],
  );

  const { data: resolved } = useTagsBySlug(slugs);
  const tags = useMemo<TagRef[]>(() => (slugs.length === 0 ? [] : resolved ?? []), [slugs, resolved]);
  const ids = useMemo(() => tags.map((t) => t.id), [tags]);

  const write = useCallback(
    (next: TagRef[]) => {
      // Seed the lookup so the new selection resolves instantly instead of after a round trip.
      const nextSlugs = next.map((t) => t.slug);
      if (nextSlugs.length > 0) queryClient.setQueryData(["tags-by-slug", nextSlugs.join(",")], next);
      const p = new URLSearchParams(params);
      if (nextSlugs.length > 0) p.set("tag", nextSlugs.join(","));
      else p.delete("tag");
      setParams(p, { replace: true });
    },
    [params, setParams, queryClient],
  );

  const add = useCallback(
    (tag: TagRef) => {
      if (tags.some((t) => t.id === tag.id)) return;
      write([...tags, tag].slice(-MAX_TAGS));
    },
    [tags, write],
  );
  const remove = useCallback((slug: string) => write(tags.filter((t) => t.slug !== slug)), [tags, write]);
  const toggle = useCallback((tag: TagRef) => (tags.some((t) => t.id === tag.id) ? remove(tag.slug) : add(tag)), [tags, add, remove]);
  const clear = useCallback(() => write([]), [write]);

  return { tags, ids, slugs, active: slugs.length > 0, add, remove, toggle, clear };
}

export type TagFilter = ReturnType<typeof useTagFilter>;
