import { useNavigate } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useSuggestedPeople } from "../hooks/useSearch";
import { usePageSuggestedPeople } from "../hooks/usePageDiscover";
import { useActiveIdentity } from "../hooks/usePages";
import { useIsRestricted } from "../hooks/useAccountAccess";
import { DiscoverShell } from "../components/discover/DiscoverShell";
import { DiscoverBrowse } from "../components/discover/DiscoverBrowse";
import { DiscoverAvatarTile, DiscoverRail } from "../components/discover/DiscoverRail";
import { RestrictedDiscover } from "./RestrictedDiscover";

// How many topic chips and people the lead section shows (search is the way to find more).
const TOPIC_LIMIT = 16;
const PEOPLE_LIMIT = 10;

// What full accounts get on top of the shared page: topic chips, and people to follow.
// Everything below it — the rows per kind of content, and Pages — is the same for every account.
function FullLead() {
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const { data: identity } = useActiveIdentity();
  const activePageId = identity?.mode === "page" ? identity.page.id : undefined;
  const personalSuggestions = useSuggestedPeople();
  const pageSuggestions = usePageSuggestedPeople(activePageId);
  const { data: suggestedPeople } = activePageId ? pageSuggestions : personalSuggestions;

  // One flat row of interests across every category — tapping one filters the Feed by it.
  const topics = (categories ?? []).flatMap((c) => c.interests).slice(0, TOPIC_LIMIT);
  const people = (suggestedPeople ?? []).slice(0, PEOPLE_LIMIT);

  return (
    <>
      {topics.length > 0 && (
        <div className="-mx-4 mb-7 overflow-x-auto no-scrollbar">
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

      {people.length > 0 && (
        <DiscoverRail title="People to follow">
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
  if (restricted) return <RestrictedDiscover />;
  return (
    <DiscoverShell
      scope="all"
      placeholder="Search Akọ"
      ariaLabel="Search people, pages, posts and projects"
      browse={<DiscoverBrowse lead={<FullLead />} />}
    />
  );
}
