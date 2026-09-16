// src/components/Sidebar.tsx
//
// Desktop navigation spine. Replaces BottomNav on md+ viewports (BottomNav
// itself gains `md:hidden`; this is its desktop counterpart, not a second
// source of truth — same routes, same unread-count hooks, same identity
// awareness as BottomNav, just laid out for a tall persistent rail instead
// of a bottom bar).
//
// Rendered once, at the shell level (see AppShell.tsx), not per-page — so
// unlike TopHeader/BottomNav it is NOT imported by individual pages.
import { useState, type ComponentType } from "react";
import { Link, NavLink, useLocation, useMatch } from "react-router-dom";
import { Search, Activity as ActivityIcon, MessageCircle, User, Bell, Plus, Wallet as WalletIcon, Settings as SettingsIcon, Radio } from "lucide-react";
import { AkoMark } from "./AkoMark";
import { Avatar } from "./Avatar";
import { useAuth } from "../hooks/useAuth";
import { useUnreadConversationCount } from "../hooks/useMessaging";
import { usePageInboxUnreadCount } from "../hooks/usePageInbox";
import { useActiveIdentity } from "../hooks/usePages";
import { useUnreadCount } from "../hooks/useNotifications";
import { useIsAdmin } from "../hooks/useAdmin";

type IconProps = { size?: number; strokeWidth?: number; fill?: string; className?: string };

// Same custom Feed glyph as BottomNav, kept in sync deliberately rather
// than imported, since BottomNav's copy is likely to get removed once
// mobile fully adopts this file — duplicating a ~10-line SVG is cheaper
// than introducing a shared-icon module for one glyph.
function FeedIcon({ size = 22, strokeWidth = 1.75, fill = "none", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

interface NavItemProps {
  to: string;
  icon: ComponentType<IconProps>;
  label: string;
  isActive?: boolean;
  badge?: number;
  collapsed: boolean;
}

function NavItem({ to, icon: Icon, label, isActive, badge, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={to}
      replace
      aria-label={label}
      title={collapsed ? label : undefined}
      className={({ isActive: routeActive }) => {
        const active = isActive ?? routeActive;
        return `group relative flex items-center gap-3 rounded-full px-3 py-2.5 text-[15px] font-medium transition-colors ${
          active ? "bg-accent-soft text-accent" : "text-ink-muted hover:bg-canvas hover:text-ink"
        }`;
      }}
    >
      {({ isActive: routeActive }) => {
        const active = isActive ?? routeActive;
        return (
          <>
            <span className="relative shrink-0">
              <Icon size={24} strokeWidth={active ? 2 : 1.75} fill={active ? "currentColor" : "none"} />
              {!!badge && badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-danger text-canvas text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </span>
            {!collapsed && <span className="truncate">{label}</span>}
          </>
        );
      }}
    </NavLink>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const { user, profile } = useAuth();
  const { data: identity } = useActiveIdentity();
  const activePageId = identity?.mode === "page" ? identity.page.id : undefined;
  const personalUnread = useUnreadConversationCount();
  const pageUnread = usePageInboxUnreadCount(activePageId);
  const messagesUnread = activePageId ? pageUnread : personalUnread;
  const notifUnread = useUnreadCount();
  const { data: isAdmin } = useIsAdmin();
  const location = useLocation();

  // `collapsed` is the pinned preference (persisted — see AppShell),
  // toggled explicitly via the button at the bottom. `isHovering` is
  // purely transient hover state. `showLabels` is what actually
  // drives rendering below: pinned-expanded always shows labels;
  // pinned-collapsed shows them only while the pointer is over the
  // rail, same "mini variant that flies out on hover" pattern as
  // VS Code's activity bar or Notion's sidebar. The rail is
  // `fixed` (out of document flow), so growing its width on hover
  // overlays the page content beneath it rather than pushing it —
  // AppShell's reserved padding-left is keyed off `collapsed` alone
  // and deliberately doesn't react to hover, or every mouse-over
  // would reflow the whole page.
  const [isHovering, setIsHovering] = useState(false);
  const showLabels = !collapsed || isHovering;

  // Same active-state disambiguation BottomNav uses: /me and /page/:username
  // both represent "your own identity" depending on acting-as-page mode.
  const profileMatch = useMatch("/profile/:username/*");
  const pageMatch = useMatch("/page/:username/*");
  const isOwnProfileActive =
    (!!profile?.username && profileMatch?.params.username === profile.username) ||
    (identity?.mode === "page" && pageMatch?.params.username === identity.page.username);
  const messagesMatch = useMatch("/messages/*");
  const pageInboxMatch = useMatch("/page-inbox/*");
  const isMessagesActive = !!messagesMatch || !!pageInboxMatch;

  const profileHref = user ? (identity?.mode === "page" ? `/page/${identity.page.username}` : "/me") : "/login";

  return (
    <aside
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`hidden md:flex md:flex-col fixed left-0 top-0 h-screen z-30 border-r border-border bg-surface transition-[width] duration-150 ${
        showLabels ? "w-64" : "w-[76px]"
      } ${
        // Only pinned-collapsed-but-hovering needs to visually float
        // over the content behind it — pinned-expanded already has
        // that space reserved for it, no shadow needed.
        collapsed && isHovering ? "shadow-xl" : ""
      }`}
    >
      {/* Brand — icon only. The mark already reads as "Akọ" on its own,
          so pairing it with a separate text label was pure redundancy.
          Sized up from the old 26px so it reads as a real brand mark,
          not an afterthought, in this persistent rail. */}
      <div className={`flex items-center px-4 pt-6 pb-4 ${!showLabels ? "justify-center px-0" : ""}`}>
        <AkoMark size={36} />
      </div>

      {/* Primary destinations */}
      <nav className="flex flex-col gap-1 px-3">
        <NavItem to="/feed" icon={FeedIcon} label="Feed" collapsed={!showLabels} />
        <NavItem to="/topics" icon={Search} label="Discover" collapsed={!showLabels} />
        <NavItem
          to={activePageId ? "/page-inbox" : "/inbox"}
          icon={MessageCircle}
          label="Messages"
          isActive={isMessagesActive}
          badge={messagesUnread}
          collapsed={!showLabels}
        />
        <NavItem to="/notifications" icon={Bell} label="Notifications" badge={notifUnread} collapsed={!showLabels} />
      </nav>

      {/* Create — primary action, not buried in a submenu */}
      <div className="px-3 pt-3">
        <Link
          to="/create"
          state={{ background: location }}
          className={`flex items-center gap-3 rounded-full bg-accent text-canvas font-semibold px-3 py-2.5 transition-opacity hover:opacity-90 ${
            !showLabels ? "justify-center" : ""
          }`}
          title={!showLabels ? "Create" : undefined}
        >
          <Plus size={22} strokeWidth={2} />
          {showLabels && <span>Create</span>}
        </Link>
      </div>

      {/* Your Akọ */}
      <div className="px-3 pt-5">
        {showLabels && (
          <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted/70">
            Your Akọ
          </div>
        )}
        <nav className="flex flex-col gap-1">
          <NavItem to={profileHref} icon={User} label="Profile" isActive={isOwnProfileActive} collapsed={!showLabels} />
          <NavItem to="/pages" icon={Radio} label="Pages" collapsed={!showLabels} />
          <NavItem to="/activity/library" icon={ActivityIcon} label="Library" collapsed={!showLabels} />
          <NavItem to="/wallet" icon={WalletIcon} label="Wallet" collapsed={!showLabels} />
        </nav>
      </div>

      <div className="mt-auto px-3 pb-4">
        <nav className="flex flex-col gap-1">
          <NavItem to="/settings" icon={SettingsIcon} label="Settings" collapsed={!showLabels} />
          {isAdmin && <NavItem to="/admin" icon={SettingsIcon} label="Admin" collapsed={!showLabels} />}
        </nav>

        {/* Own identity, bottom of rail — mirrors where Instagram/TikTok
            anchor the account switcher on desktop, without pulling
            AccountSwitcher's full popover logic into this pass. */}
        <Link
          to={profileHref}
          className={`mt-2 flex items-center gap-2.5 rounded-full px-3 py-2 hover:bg-canvas ${
            !showLabels ? "justify-center" : ""
          }`}
        >
          <Avatar src={profile?.avatar_url} name={profile?.username ?? "You"} size="sm" />
          {showLabels && (
            <span className="truncate text-sm font-medium text-ink">
              {profile?.username ? `@${profile.username}` : "You"}
            </span>
          )}
        </Link>

        <button
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Pin sidebar open" : "Collapse sidebar"}
          title={collapsed ? "Pin sidebar open" : "Collapse sidebar"}
          className="mt-2 w-full text-left text-xs text-ink-muted hover:text-ink px-3 py-1.5"
        >
          {showLabels ? (collapsed ? "Pin open »" : "« Collapse") : "»"}
        </button>
      </div>
    </aside>
  );
}

