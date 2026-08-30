import { NavLink } from "react-router-dom";
import { Home, Compass, PlusCircle, Bell, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useUnreadCount } from "../hooks/useNotifications";

const navItems = [
  { to: "/feed", icon: Home, label: "Feed" },
  { to: "/topics", icon: Compass, label: "Topics" },
  { to: "/compose", icon: PlusCircle, label: "Post" },
];

export function BottomNav() {
  const { user } = useAuth();
  const unreadCount = useUnreadCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-canvas border-t border-border px-2 py-2 flex items-center justify-around z-40">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isActive ? "text-accent" : "text-ink-muted"
            }`
          }
        >
          <Icon size={22} strokeWidth={2} />
          {label}
        </NavLink>
      ))}

      <NavLink
        to="/notifications"
        className={({ isActive }) =>
          `relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isActive ? "text-accent" : "text-ink-muted"
          }`
        }
      >
        <div className="relative">
          <Bell size={22} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-danger text-canvas text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        Alerts
      </NavLink>

      <NavLink
        to={user ? `/me` : "/login"}
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isActive ? "text-accent" : "text-ink-muted"
          }`
        }
      >
        <User size={22} strokeWidth={2} />
        Profile
      </NavLink>
    </nav>
  );
}
