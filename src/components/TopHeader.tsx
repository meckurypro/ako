import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Wordmark } from "./Wordmark";
import { Avatar } from "./Avatar";
import { useUnreadCount } from "../hooks/useNotifications";
import { useMyProfile } from "../hooks/useProfile";

interface TopHeaderProps {
  showTagline?: boolean;
}

// Matches the mockup: your own avatar on the left (in place of the
// old search icon), the wordmark centered, and only the notification
// bell on the right — no wallet icon here anymore. Wallet access
// moved to the profile page's owner action row instead.
export function TopHeader({ showTagline = false }: TopHeaderProps) {
  const unreadCount = useUnreadCount();
  const { data: me } = useMyProfile();

  return (
    <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center justify-between">
      <Link to={me ? `/profile/${me.username}` : "/me"} aria-label="Your profile">
        <Avatar src={me?.avatar_url} name={me?.display_name ?? "You"} size="sm" />
      </Link>

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
