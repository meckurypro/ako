import { NavLink } from "react-router-dom";
import { Home, Search, Plus, MessageCircle, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useUnreadConversationCount } from "../hooks/useMessaging";

const sideItems = [
  { to: "/feed", icon: Home, label: "Feed" },
  { to: "/topics", icon: Search, label: "Discover" },
] as const;

export function BottomNav() {
  const { user } = useAuth();
  const unreadCount = useUnreadConversationCount();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-1 w-14 text-[11px] font-medium transition-colors ${
      isActive ? "text-accent" : "text-ink-muted"
    }`;

  return (
    // A hairline top border does the "outline" work; the shadow itself
    // is now just a faint, tight, near-zero-spread lift — not a cast
    // shadow that reaches up into the post content above.
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface rounded-t-[28px] border-t border-border shadow-[0_-1px_3px_rgba(31,29,26,0.06)] px-2 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <div className="flex items-end justify-around">
        {sideItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={linkClass}>
            <Icon size={24} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}

        <div className="flex flex-col items-center gap-1 w-14">
          <div className="relative -mt-4 mb-1">
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-surface shadow-[0_-1px_3px_rgba(31,29,26,0.06)]"
            />
            <NavLink
              to="/compose"
              aria-label="New post"
              className="relative flex items-center justify-center w-12 h-12 rounded-full bg-accent text-canvas shadow-md"
            >
              <Plus size={22} strokeWidth={2.25} />
            </NavLink>
          </div>
          <span className="text-[11px] font-medium text-ink-muted">Post</span>
        </div>

        <NavLink to="/messages" className={linkClass}>
          <div className="relative">
            <MessageCircle size={24} strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-danger text-canvas text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          Messages
        </NavLink>

        <NavLink to={user ? `/me` : "/login"} className={linkClass}>
          <User size={24} strokeWidth={1.75} />
          Profile
        </NavLink>
      </div>
    </nav>
  );
}
