import { Link } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { useSuggestedPeople } from "../hooks/useSearch";
import { usePageSuggestedPeople } from "../hooks/usePageDiscover";
import { useActiveIdentity } from "../hooks/usePages";
import { useIsRestricted } from "../hooks/useAccountAccess";
import { useSuggestedTags, useTagPeople, type TagRef } from "../hooks/useTags";
import { useTagFilter, type TagFilter } from "../hooks/useTagFilter";
import { DiscoverShell } from "../components/discover/DiscoverShell";
import { DiscoverBrowse } from "../components/discover/DiscoverBrowse";
import { DiscoverAvatarTile, DiscoverRail } from "../components/discover/DiscoverRail";
import { RestrictedDiscover } from "./RestrictedDiscover";

// How many topic chips and people the lead section shows (search is the way to find more).
const TOPIC_LIMIT = 16;
const PEOPLE_LIMIT = 10;

// What full accounts get on top of the shared page: topic chips, and people to follow.
// Everything below it — the rows per kind of content, and Pages — is the same for every account.
//
// The chips come from the database, not a fixed list: the viewer's own interests first (the ones chosen at
// onboarding / in Settings), then topics connected to those, then what's popular. Tapping a chip filters this
// page in place — projects, groups, talents, pages and people — it never leaves Discover.
function FullLead({ filter }: { filter: TagFilter }) {
  const { data: suggestedTags } = useSuggestedTags(TOPIC_LIMIT);
  const { data: identity } = useActiveIdentity();
  const activePageId = identity?.mode === "page" ? identity.page.id : undefined;
  const personalSuggestions = useSuggestedPeople();
  const pageSuggestions = usePageSuggestedPeople(activePageId);
  const { data: suggestedPeople } = activePageId ? pageSuggestions : personalSuggestions;
  const taggedPeople = useTagPeople(filter.ids, PEOPLE_LIMIT);

  const selectedIds = new Set(filter.tags.map((t) => t.id));
  // Selected topics lead (even ones that came from search and aren't in the suggestions), then the rest.
  const chips: Array<TagRef & { mine: boolean }> = [
    ...filter.tags.map((t) => ({ ...t, mine: false })),
    ...(suggestedTags ?? []).filter((t) => !selectedIds.has(t.id)).map((t) => ({ id: t.id, name: t.name, slug: t.slug, mine: t.reason === "mine" })),
  ];

  const people = filter.active ? taggedPeople.data ?? [] : (suggestedPeople ?? []).slice(0, PEOPLE_LIMIT);
  const peopleTitle = filter.active ? `People into ${filter.tags.map((t) => t.name).join(", ")}` : "People to follow";

  return (
    <>
      <div className="-mx-4 mb-7 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 px-4 w-max">
          {filter.active && (
            <button
              onClick={filter.clear}
              aria-label="Clear topic filters"
              className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm bg-surface text-ink-muted border border-border hover:text-ink transition-colors"
            >
              <X size={14} />
              Clear
            </button>
          )}
          {chips.map((chip) => {
            const on = selectedIds.has(chip.id);
            return (
              <button
                key={chip.id}
                onClick={() => filter.toggle(chip)}
                aria-pressed={on}
                className={`shrink-0 px-3.5 py-2 rounded-full text-sm border transition-colors ${
                  on
                    ? "bg-cta text-white border-cta"
                    : chip.mine
                      ? "bg-surface text-ink border-accent/40 hover:border-accent"
                      : "bg-surface text-ink border-border hover:border-accent/50"
                }`}
              >
                {chip.name}
              </button>
            );
          })}
          <Link
            to="/settings?section=interests"
            className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm text-accent border border-dashed border-accent/40 hover:border-accent transition-colors"
          >
            <Plus size={14} />
            Interests
          </Link>
        </div>
      </div>

      {people.length > 0 && (
        <DiscoverRail title={peopleTitle}>
          {people.map((p) => (
            <DiscoverAvatarTile
              key={p.id}
              to={`/profile/${p.username}`}
              name={p.display_name}
              avatarUrl={p.avatar_url}
              caption={`@${p.username}`}
            />
          ))}
        </DiscoverRail>
      )}
    </>
  );
}

export function Discover() {
  const restricted = useIsRestricted();
  const filter = useTagFilter();
  if (restricted) return <RestrictedDiscover />;
  return (
    <DiscoverShell
      scope="all"
      placeholder="Search Akọ"
      ariaLabel="Search people, pages, posts and projects"
      tags={filter.tags}
      onRemoveTag={filter.remove}
      onPickTag={filter.add}
      browse={<DiscoverBrowse tags={filter.tags} onPickTag={filter.add} lead={<FullLead filter={filter} />} />}
    />
  );
}
