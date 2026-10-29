import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { closestPathway, useMyFeedAccess } from "../hooks/useFeedAccess";
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
      browse={<DiscoverBrowse lead={<FeedAccessCard />} />}
    />
  );
}

// Progressive Access entry point: shows the pathway this account is closest to finishing, and
// links to the full list. Renders nothing until progress is known, or when automatic unlocking is
// paused or the account is held by an admin (nothing for the user to work towards).
function FeedAccessCard() {
  const { data } = useMyFeedAccess();
  if (!data || data.has_feed_access || !data.progressive_enabled || data.auto_unlock_blocked) return null;
  const next = closestPathway(data.rules);
  if (!next) return null;
  const pct = Math.round(next.progress * 100);
  return (
    <Link to="/feed-access" className="block bg-surface rounded-xl p-4 border border-border mb-7">
      <div className="flex items-center justify-between">
        <p className="font-medium text-ink text-sm">Unlock the Feed</p>
        <ArrowRight size={16} className="text-ink-muted" />
      </div>
      <p className="text-sm text-ink-muted mt-0.5">
        {pct > 0 ? `${next.name} — ${pct}% there` : "Choose a path that fits why you're here"}
      </p>
      <div className="h-1.5 rounded-full bg-border mt-2.5 overflow-hidden">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}
