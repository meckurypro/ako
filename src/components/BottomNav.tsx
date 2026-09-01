import { NavLink } from "react-router-dom";
import { Home, Search, Plus, MessageCircle, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useUnreadConversationCount } from "../hooks/useMessaging";

// Feed and Discover sit either side of the center Post button;
// Messages and Profile sit on the far side of it. Notifications live
// only in TopHeader's bell — keeping them out of BottomNav too would
// mean losing quick access to messages, which the product decision
// was to keep.
const sideItems = [
  { to: "/feed", icon: Home, label: "Feed" },
  { to: "/topics", icon: Search, label: "Discover" },
] as const;

export function BottomNav() {
  const { user } = useAuth();
  const unreadCount = useUnreadConversationCount();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
      isActive ? "text-accent" : "text-ink-muted"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-canvas border-t border-border px-2 pt-2 pb-3 flex items-center justify-around z-40">
      {sideItems.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} className={linkClass}>
          <Icon size={22} strokeWidth={2} />
          {label}
        </NavLink>
      ))}

      {/* The single "new post" entry point — this used to also have a
          floating action button on the Feed screen, which duplicated
          this one. This is now the only way to start a post. */}
      <NavLink to="/compose" aria-label="New post" className="flex flex-col items-center -mt-6">
        <span className="bg-accent text-canvas rounded-full p-3.5 shadow-lg">
          <Plus size={24} strokeWidth={2.5} />
        </span>
      </NavLink>

      <NavLink to="/messages" className={linkClass}>
        <div className="relative">
          <MessageCircle size={22} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-danger text-canvas text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        Messages
      </NavLink>

      <NavLink to={user ? `/me` : "/login"} className={linkClass}>
        <User size={22} strokeWidth={2} />
        Profile
      </NavLink>
    </nav>
  );
}
