import type { ComponentType } from "react";
import { NavLink, useMatch } from "react-router-dom";
import { Search, Activity as ActivityIcon, MessageCircle, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useUnreadConversationCount } from "../hooks/useMessaging";

// Lucide's Home icon always draws a door line as part of the glyph —
// looks odd here at both weights, and doesn't read as a clean solid
// shape when filled. This is a plain roof-and-frame silhouette
// instead: no door, so the active/filled state is a clean shape.
type IconProps = { size?: number; strokeWidth?: number; fill?: string };

function FeedIcon({ size = 24, strokeWidth = 1.75, fill = "none" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

// All five items now render at the same weight — no raised FAB for
// composing. That entry point moved to the "+" on Feed's header,
// which opens /create (see CreateChoice.tsx).
const navItems = [
  { to: "/feed", icon: FeedIcon, label: "Feed" },
  { to: "/topics", icon: Search, label: "Discover" },
] as const;

function NavIcon({ Icon, isActive }: { Icon: ComponentType<IconProps>; isActive: boolean }) {
  return (
    <Icon
      size={24}
      strokeWidth={isActive ? 2 : 1.75}
      fill={isActive ? "currentColor" : "none"}
    />
  );
}

export function BottomNav() {
  const { user, profile } = useAuth();
  const unreadCount = useUnreadConversationCount();

  // Compare the :username in the URL to OUR OWN username — not a path
  // prefix match — so this is only active on our own profile, never
  // on someone else's, and works regardless of /me's redirect.
  const profileMatch = useMatch("/profile/:username/*");
  const isOwnProfileActive =
    !!profile?.username && profileMatch?.params.username === profile.username;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-1 w-14 text-[11px] font-medium transition-colors ${
      isActive ? "text-accent" : "text-ink-muted"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface rounded-t-[28px] border-t border-border shadow-[0_-1px_3px_rgba(var(--shadow-ink-rgb),0.06)] px-2 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <div className="flex items-center justify-around">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} replace className={linkClass}>
            {({ isActive }) => (
              <>
                <NavIcon Icon={Icon} isActive={isActive} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        <NavLink to="/activity" replace className={linkClass}>
          {({ isActive }) => (
            <>
              <NavIcon Icon={ActivityIcon} isActive={isActive} />
              Activity
            </>
          )}
        </NavLink>

        <NavLink to="/messages" replace className={linkClass}>
          {({ isActive }) => (
            <>
              <div className="relative">
                <NavIcon Icon={MessageCircle} isActive={isActive} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-danger text-canvas text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              Messages
            </>
          )}
        </NavLink>

        <NavLink
          to={user ? "/me" : "/login"}
          replace
          className={`flex flex-col items-center gap-1 w-14 text-[11px] font-medium transition-colors ${
            isOwnProfileActive ? "text-accent" : "text-ink-muted"
          }`}
        >
          <NavIcon Icon={User} isActive={isOwnProfileActive} />
          Profile
        </NavLink>
      </div>
    </nav>
  );
}
