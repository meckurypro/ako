import { Link } from "react-router-dom";
import { Avatar } from "./Avatar";
import { TierBadge } from "./TierBadge";
import { RoleTags } from "./RoleTags";
import type { ProfileWithRoles } from "../types/database";

// One person in a list (Discover suggestions, search results). Whole row
// is the tap target — comfortably above the 44px minimum touch height.
export function PersonRow({
  profile,
  onVisit,
}: {
  profile: ProfileWithRoles;
  /** Called only for rows rendered from an active search, so visiting the
   *  profile bumps it to the top of future search results. */
  onVisit?: (profileId: string) => void;
}) {
  return (
    <Link
      to={`/profile/${profile.username}`}
      onClick={() => onVisit?.(profile.id)}
      className="flex items-center gap-3 py-3 min-h-[56px]"
    >
      <Avatar src={profile.avatar_url} name={profile.display_name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-ink text-sm">{profile.display_name}</span>
          <TierBadge tier={profile.tier} />
        </div>
        {profile.roles?.length > 0 && (
          <RoleTags roles={profile.roles} className="text-xs text-ink-muted" />
        )}
        <p className="text-xs text-ink-muted mt-0.5">@{profile.username}</p>
      </div>
      {profile.follower_count > 0 && (
        <span className="text-xs text-ink-muted shrink-0">
          {profile.follower_count.toLocaleString()} followers
        </span>
      )}
    </Link>
  );
}
