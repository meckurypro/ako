import { Link } from "react-router-dom";
import { Bell, Plus } from "lucide-react";
import { Wordmark } from "./Wordmark";
import { Avatar } from "./Avatar";
import { useUnreadCount } from "../hooks/useNotifications";
import { useMyProfile } from "../hooks/useProfile";

interface TopHeaderProps {
  showTagline?: boolean;
  // Feed passes "create" — a "+" that opens /create (see
  // CreateChoice.tsx) in place of the own-avatar link. Every other
  // caller (Discover) keeps the avatar, unchanged.
  leftAction?: "avatar" | "create";
}

// Matches the mockup: your own avatar on the left (in place of the
// old search icon) on most screens — Feed swaps it for a "+" that
// opens the create sheet — the wordmark centered, and only the
// notification bell on the right — no wallet icon here anymore.
// Wallet access moved to the profile page's owner action row instead.
//
// No shadow here — this sits inside Feed's sticky bg-surface wrapper
// together with the tabs row below it, and the shadow for that whole
// combined block lives on the wrapper, not here.
export function TopHeader({ showTagline = false, leftAction = "avatar" }: TopHeaderProps) {
  const unreadCount = useUnreadCount();
  const { data: me } = useMyProfile();

  return (
    <header className="px-4 pt-5 pb-2 bg-surface flex items-center justify-between">
      {leftAction === "create" ? (
        <Link
          to="/create"
          aria-label="Create"
          className="flex items-center justify-center w-9 h-9 -ml-1.5 rounded-full text-ink-muted"
        >
          <Plus size={24} strokeWidth={2} />
        </Link>
      ) : (
        <Link to={me ? `/profile/${me.username}` : "/me"} aria-label="Your profile">
          <Avatar src={me?.avatar_url} name={me?.display_name ?? "You"} size="sm" />
        </Link>
      )}

      <Wordmark size="sm" showTagline={showTagline} />

      <Link to="/notifications" className="relative text-ink-muted">
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-danger text-canvas text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    </header>
  );
}
