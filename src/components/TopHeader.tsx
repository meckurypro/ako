import { Link } from "react-router-dom";
import { Wallet, Bell, Search } from "lucide-react";
import { Wordmark } from "./Wordmark";
import { useUnreadCount } from "../hooks/useNotifications";

interface TopHeaderProps {
  showTagline?: boolean;
}

export function TopHeader({ showTagline = false }: TopHeaderProps) {
  const unreadCount = useUnreadCount();

  return (
    <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center justify-between">
      <Link to="/search" className="text-ink-muted">
        <Search size={22} />
      </Link>
      <Wordmark size="sm" showTagline={showTagline} />
      <div className="flex items-center gap-3">
        <Link to="/notifications" className="relative text-ink-muted">
          <Bell size={22} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-danger text-canvas text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
        <Link to="/wallet" className="text-ink-muted">
          <Wallet size={22} />
        </Link>
      </div>
    </header>
  );
}
