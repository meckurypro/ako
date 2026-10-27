import { DiscoverShell } from "../components/discover/DiscoverShell";
import { DiscoverBrowse } from "../components/discover/DiscoverBrowse";

// Discover for restricted (consumer-only) accounts: the same structured page as everyone else —
// a swipeable row per kind of content, then Pages — minus the people section. Never people or posts.
// Same search experience as full accounts, scoped down.
export function RestrictedDiscover() {
  return (
    <DiscoverShell
      scope="discover"
      placeholder="Search pages and projects"
      ariaLabel="Search pages and projects"
      browse={<DiscoverBrowse />}
    />
  );
}
