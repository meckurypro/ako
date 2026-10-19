import { useNavigate } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useSuggestedPages, useSuggestedPeople } from "../hooks/useSearch";
import { usePageSuggestedPeople } from "../hooks/usePageDiscover";
import { useActiveIdentity } from "../hooks/usePages";
import { useIsRestricted } from "../hooks/useAccountAccess";
import { PersonRow } from "../components/PersonRow";
import { PageRow } from "../components/PageRow";
import { DiscoverShell } from "../components/discover/DiscoverShell";
import { SectionHeader } from "../components/discover/SectionHeader";
import { RestrictedDiscover } from "./RestrictedDiscover";

// How many suggestions each section shows (search is the way to find more),
// and how many topic chips.
const SUGGESTION_LIMIT = 6;
const TOPIC_LIMIT = 16;

function FullBrowse() {
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const { data: identity } = useActiveIdentity();
  const activePageId = identity?.mode === "page" ? identity.page.id : undefined;
  const personalSuggestions = useSuggestedPeople();
  const pageSuggestions = usePageSuggestedPeople(activePageId);
  const { data: suggestedPeople, isLoading: suggestedLoading } = activePageId
    ? pageSuggestions
    : personalSuggestions;
  const { data: suggestedPages, isLoading: suggestedPagesLoading } = useSuggestedPages();

  // One flat row of interests across every category — tapping one filters the
  // Feed by it. (This used to be an accordion of every category, which buried
  // the page.)
  const topics = (categories ?? []).flatMap((c) => c.interests).slice(0, TOPIC_LIMIT);

  return (
    <div className="animate-ako-fade-up">
      {topics.length > 0 && (
        <div className="-mx-4 mb-8 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 px-4 w-max">
            {topics.map((interest) => (
              <button
                key={interest.id}
                onClick={() => navigate(`/feed?interest=${interest.id}`)}
                className="shrink-0 px-3.5 py-2 rounded-full text-sm bg-surface text-ink border border-border hover:border-accent/50 transition-colors"
              >
                {interest.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="mb-9">
        <SectionHeader
          title="People to follow"
          subtitle={activePageId ? "Based on this page's network and activity." : "Based on your network and activity."}
        />
        {suggestedLoading ? (
          <p className="text-ink-muted text-sm py-4">Loading…</p>
        ) : suggestedPeople && suggestedPeople.length > 0 ? (
          <div className="divide-y divide-border">
            {suggestedPeople.slice(0, SUGGESTION_LIMIT).map((p) => (
              <PersonRow key={p.id} profile={p} />
            ))}
          </div>
        ) : (
          <p className="text-ink-muted text-sm py-4">No suggestions right now.</p>
        )}
      </section>

      <section>
        <SectionHeader title="Pages to follow" subtitle="Organisations, brands and products worth a look." />
        {suggestedPagesLoading ? (
          <p className="text-ink-muted text-sm py-4">Loading…</p>
        ) : suggestedPages && suggestedPages.length > 0 ? (
          <div className="divide-y divide-border">
            {suggestedPages.slice(0, SUGGESTION_LIMIT).map((p) => (
              <PageRow key={p.id} page={p} />
            ))}
          </div>
        ) : (
          <p className="text-ink-muted text-sm py-4">No pages to suggest right now.</p>
        )}
      </section>
    </div>
  );
}

export function Discover() {
  const restricted = useIsRestricted();
  if (restricted) return <RestrictedDiscover />;
  return (
    <DiscoverShell
      scope="all"
      placeholder="Search Akọ"
      ariaLabel="Search people, pages, posts and projects"
      browse={<FullBrowse />}
    />
  );
}
