// src/components/ProfileGroups.tsx
//
// "Creator, AI for Africa" / "Participant, 30 Days AI Mastery" — the public groups a person has chosen to list.
// The server decides what comes back (their setting, private groups never, private accounts, blocks), so an empty
// list renders nothing at all.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useProfileGroups } from "../hooks/useRoom";
import { getGroupPath, groupRoleLabel } from "../lib/groups";

const COLLAPSED_COUNT = 3;

export function ProfileGroups({ profileId }: { profileId: string | undefined }) {
  const { data: groups } = useProfileGroups(profileId);
  const [expanded, setExpanded] = useState(false);
  if (!groups || groups.length === 0) return null;

  const shown = expanded ? groups : groups.slice(0, COLLAPSED_COUNT);
  return (
    <div className="mt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted mb-1.5">Groups</p>
      <ul className="flex flex-col gap-1">
        {shown.map((g) => (
          <li key={g.project_id} className="text-sm text-ink-muted">
            {groupRoleLabel(g.role, g.kind)},{" "}
            <Link to={getGroupPath({ id: g.project_id, slug: g.slug })} className="text-accent font-medium">
              {g.title}
            </Link>
          </li>
        ))}
      </ul>
      {groups.length > COLLAPSED_COUNT && (
        <button onClick={() => setExpanded((v) => !v)} className="mt-1 text-xs text-ink-muted font-medium">
          {expanded ? "Show fewer" : `Show all ${groups.length}`}
        </button>
      )}
    </div>
  );
}
