// src/components/PageTeamShowcase.tsx
// "Meet the team" — the landing-page section showing ONLY the members a page admin chose
// to feature: avatar, name, role and a short bio, like a website's team section. It never
// shows how many people are on the team, and renders nothing when no one is featured.
import { Link } from "react-router-dom";
import { Avatar } from "./Avatar";
import type { PageMemberWithProfile } from "../types/database";

export function PageTeamShowcase({ members }: { members: PageMemberWithProfile[] }) {
  if (members.length === 0) return null;

  return (
    <section aria-labelledby="page-team-heading">
      <h2 id="page-team-heading" className="font-display text-xl font-semibold tracking-tight text-ink">
        Meet the team
      </h2>

      {/* Phones: a swipeable row that peeks the next card. Larger screens: a grid. */}
      <ul className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {members.map((m) => (
          <li key={m.id} className="w-[72%] shrink-0 snap-start sm:w-[46%] md:w-auto">
            <Link
              to={`/profile/${m.profile.username}`}
              className="flex h-full flex-col rounded-2xl border border-border bg-surface p-4 transition-transform active:scale-[0.98]"
            >
              <Avatar src={m.profile.avatar_url} name={m.profile.display_name} size="lg" />
              <p className="mt-3 truncate text-base font-semibold text-ink">{m.profile.display_name}</p>
              <p className="mt-0.5 truncate text-xs font-medium uppercase tracking-wide text-accent">{m.role_label}</p>
              {m.profile.bio && (
                <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-ink-muted">{m.profile.bio}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
