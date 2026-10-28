// src/pages/DiscoverMore.tsx
//
// "More" from a Discover row: everything of one kind (events, courses, books, … or pages),
// in a tight grid, loaded a page at a time on request — a button, not endless scroll, so the
// list never runs away from the reader. Works the same for restricted and full accounts.
import { Navigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useSmartBack } from "../hooks/useSmartBack";
import {
  getDiscoverSectionTitle,
  useDiscoverMore,
  useDiscoverPagesMore,
} from "../hooks/useDiscoverBrowse";
import { BottomNav } from "../components/BottomNav";
import { PageRow } from "../components/PageRow";
import { DiscoverTile } from "../components/discover/DiscoverRail";

import { BrandDot } from "../components/BrandDot";
function ShowMore({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div className="mt-6 flex justify-center">
      <button
        onClick={onClick}
        disabled={loading}
        className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent/50 disabled:opacity-60"
      >
        {loading ? "Loading…" : "Show more"}
      </button>
    </div>
  );
}

function ProjectsMore({ sectionKey }: { sectionKey: string }) {
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useDiscoverMore(sectionKey);
  const items = (data?.pages ?? []).flatMap((p) => p.items);

  if (isLoading) return <p className="py-4 text-sm text-ink-muted">Loading…</p>;
  if (isError) return <p className="py-4 text-sm text-ink-muted">Couldn't load this right now. Try again in a moment.</p>;
  if (items.length === 0) return <p className="py-4 text-sm text-ink-muted">Nothing here yet.</p>;

  return (
    <>
      <div className="grid grid-cols-3 items-start gap-x-3 gap-y-5 sm:grid-cols-4">
        {items.map((item) => (
          <DiscoverTile key={item.project.id} item={item} fluid />
        ))}
      </div>
      {hasNextPage && <ShowMore onClick={() => fetchNextPage()} loading={isFetchingNextPage} />}
    </>
  );
}

function PagesMore() {
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useDiscoverPagesMore();
  const pages = (data?.pages ?? []).flat();

  if (isLoading) return <p className="py-4 text-sm text-ink-muted">Loading…</p>;
  if (isError) return <p className="py-4 text-sm text-ink-muted">Couldn't load this right now. Try again in a moment.</p>;
  if (pages.length === 0) return <p className="py-4 text-sm text-ink-muted">Nothing here yet.</p>;

  return (
    <>
      <div className="divide-y divide-border">
        {pages.map((p) => (
          <PageRow key={p.id} page={p} />
        ))}
      </div>
      {hasNextPage && <ShowMore onClick={() => fetchNextPage()} loading={isFetchingNextPage} />}
    </>
  );
}

export function DiscoverMore() {
  const { section = "" } = useParams();
  const smartBack = useSmartBack();
  const title = getDiscoverSectionTitle(section);

  // An unknown kind (a stale link, a typo) goes back to Discover rather than a blank page.
  if (!title) return <Navigate to="/topics" replace />;

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-24">
      <div className="mx-auto max-w-xl md:max-w-2xl">
        <button onClick={smartBack} aria-label="Back" className="mb-4 text-ink-muted">
          <ArrowLeft size={22} />
        </button>
        <h1 className="mb-5 font-display text-2xl text-ink">{title}<BrandDot /></h1>
        {section === "pages" ? <PagesMore /> : <ProjectsMore sectionKey={section} />}
      </div>
      <BottomNav />
    </div>
  );
}
