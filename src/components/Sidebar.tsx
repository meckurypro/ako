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
import { useEffect, useRef, useState, type ComponentType } from "react";
import { Link, NavLink, useLocation, useMatch, type Location } from "react-router-dom";
import { ProfilePagesModal } from "./ProfilePagesModal";
import { Search, MessageCircle, User, Bell, Plus, Wallet as WalletIcon, Settings as SettingsIcon, Radio, LibraryBig, Users } from "lucide-react";
import { AkoMark } from "./AkoMark";
import { Avatar } from "./Avatar";
import { useAuth } from "../hooks/useAuth";
import { useUnreadConversationCount } from "../hooks/useMessaging";
import { usePageInboxUnreadCount } from "../hooks/usePageInbox";
import { useActiveIdentity } from "../hooks/usePages";
import { useUnreadCount } from "../hooks/useNotifications";
import { useIsAdmin } from "../hooks/useAdmin";
import { useIsRestricted } from "../hooks/useAccountAccess";
import { useCanCreateAnyProject } from "../hooks/useCreatorKinds";
import { useMediaQuery } from "../hooks/useMediaQuery";

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

// Hover intent: the rail only flies out once the pointer has settled on it
// (so brushing the left edge doesn't flash it open) and only folds away
// once the pointer has clearly left (so a slight overshoot doesn't).
const HOVER_OPEN_DELAY_MS = 120;
const HOVER_CLOSE_DELAY_MS = 80;

// Two-pane and immersive routes where a flyout covering the left ~180px
// of the page would hide real content (the conversation list, a reader,
// a room). On these the collapsed rail stays icons-only on hover — the
// `title` tooltips on each item name the destinations instead. A prefix
// ending in "/" matches only children; any other prefix matches itself
// and its children. /inbox is a redirect (MyInboxRedirect) to /messages
// or /page-inbox; it's listed so the lock holds on the very first frame.
const HOVER_LOCKED_PREFIXES = ["/messages", "/inbox", "/page-inbox", "/rooms/", "/meetings/"];

function isHoverLockedPath(pathname: string) {
  if (pathname.endsWith("/read")) return true;
  return HOVER_LOCKED_PREFIXES.some((p) =>
    p.endsWith("/") ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p + "/")
  );
}

// Only keyboard focus should fly the rail out. A mouse click also focuses
// the link, and without this check the rail would stay open after every
// click until focus moved elsewhere.
function isKeyboardFocus(el: Element) {
  try {
    return el.matches(":focus-visible");
  } catch {
    return true;
  }
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
  const restricted = useIsRestricted();
  const restrictedCanCreate = useCanCreateAnyProject();
  const location = useLocation();
  const [pagesOpen, setPagesOpen] = useState(false);

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
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Below lg a pinned-open 256px rail plus the 380px message list leaves
  // the thread cramped (~390px at 1024), so the pin only takes effect at
  // lg+ (AppShell mirrors this in CSS for the reserved padding). Below
  // lg the rail behaves as collapsed regardless of the stored pin.
  const isLg = useMediaQuery("(min-width: 1024px)");
  const pinnedOpen = !collapsed && isLg;

  // Hover-lock is decided off the page underneath when /create is open
  // as a modal over a background route (same rule AppShell uses).
  const backgroundLocation = (location.state as { background?: Location } | null)?.background;
  const hoverLocked = isHoverLockedPath((backgroundLocation ?? location).pathname);

  // Derived, not stored: navigating onto a locked route folds the rail
  // immediately even though the pointer is still over it.
  const flyoutOpen = !pinnedOpen && ((isHovering && !hoverLocked) || isKeyboardFocused);
  const showLabels = pinnedOpen || flyoutOpen;

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  function setHoverIntent(next: boolean) {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    // Re-entering before the close timer fired: still open, nothing to wait for.
    if (next && isHovering) return;
    hoverTimer.current = setTimeout(
      () => {
        hoverTimer.current = null;
        setIsHovering(next);
      },
      next ? HOVER_OPEN_DELAY_MS : HOVER_CLOSE_DELAY_MS
    );
  }

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
    <>
    {/* Dim layer while the flyout is open: below the rail (z-scrim <
        z-sidebar), above page chrome (z-chrome). Never intercepts input. */}
    <div
      aria-hidden
      className={`hidden md:block pointer-events-none fixed inset-0 bg-ink/10 z-scrim transition-opacity duration-150 ${
        flyoutOpen ? "opacity-100" : "opacity-0"
      }`}
    />
    <aside
      onMouseEnter={() => setHoverIntent(true)}
      onMouseLeave={() => setHoverIntent(false)}
      onFocus={(e) => {
        if (isKeyboardFocus(e.target)) setIsKeyboardFocused(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsKeyboardFocused(false);
      }}
      className={`hidden md:flex md:flex-col fixed left-0 top-0 h-screen h-dvh z-sidebar border-r border-border bg-surface transition-[width] duration-150 ${
        showLabels ? "w-64" : "w-[76px]"
      } ${
        // Only a flyout (collapsed rail temporarily open) floats over
        // the content behind it — a pinned rail has its space reserved
        // by AppShell, and a hover-locked rail never opens.
        flyoutOpen ? "shadow-xl" : ""
      }`}
    >
      {/* Brand — icon only. The mark already reads as "Akọ" on its own,
          so pairing it with a separate text label was pure redundancy.
          Sized up from the old 26px so it reads as a real brand mark,
          not an afterthought, in this persistent rail. */}
      <div className={`flex shrink-0 items-center px-4 pt-6 pb-4 ${!showLabels ? "justify-center px-0" : ""}`}>
        <AkoMark size={36} />
      </div>

      {/* Middle region: takes whatever height is left and scrolls on short
          viewports, so expanding the rail (labels + the "Your Akọ" heading add
          height) can never push the bottom block — Settings, profile, the pin
          toggle — off the end of the screen. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden no-scrollbar">
      {/* Primary destinations */}
      <nav className="flex flex-col gap-1 px-3">
        {!restricted && <NavItem to="/feed" icon={FeedIcon} label="Feed" collapsed={!showLabels} />}
        <NavItem to="/topics" icon={Search} label="Discover" collapsed={!showLabels} />
        <NavItem
          to={activePageId ? "/page-inbox" : "/inbox"}
          icon={MessageCircle}
          label="Chats"
          isActive={isMessagesActive}
          badge={messagesUnread}
          collapsed={!showLabels}
        />
        <NavItem to="/notifications" icon={Bell} label="Notifications" badge={notifUnread} collapsed={!showLabels} />
      </nav>

      {/* Create — primary action, not buried in a submenu */}
      {(!restricted || restrictedCanCreate) && (
        <div className="px-3 pt-3">
          <Link
            to={restricted ? "/projects/new" : "/create"}
            state={restricted ? undefined : { background: location }}
            className={`flex items-center gap-3 rounded-full bg-accent text-canvas font-semibold px-3 py-2.5 transition-opacity hover:opacity-90 ${
              !showLabels ? "justify-center" : ""
            }`}
            title={!showLabels ? "Create" : undefined}
          >
            <Plus size={22} strokeWidth={2} />
            {showLabels && <span>Create</span>}
          </Link>
        </div>
      )}

      {/* Your Akọ */}
      <div className="px-3 pt-5">
        {/* Same height in both states (a hairline when collapsed) so hovering
            the rail open doesn't shift everything below it downward. */}
        <div className="h-6 px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted/70">
          {showLabels ? (
            "Your Akọ"
          ) : (
            <div aria-hidden className="mx-1 mt-2.5 h-px bg-border" />
          )}
        </div>
        <nav className="flex flex-col gap-1">
          <NavItem to={profileHref} icon={User} label="Profile" isActive={isOwnProfileActive} collapsed={!showLabels} />
          <button
            type="button"
            onClick={() => setPagesOpen(true)}
            aria-label="Pages"
            title={!showLabels ? "Pages" : undefined}
            className="group relative flex items-center gap-3 rounded-full px-3 py-2.5 text-left text-[15px] font-medium text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            <span className="relative shrink-0">
              <Radio size={24} strokeWidth={1.75} fill="none" />
            </span>
            {showLabels && <span className="truncate">Pages</span>}
          </button>
          <NavItem to="/library" icon={LibraryBig} label="Library" collapsed={!showLabels} />
          <NavItem to="/connect" icon={Users} label="Connect" collapsed={!showLabels} />
          <NavItem to="/wallet" icon={WalletIcon} label="Wallet" collapsed={!showLabels} />
        </nav>
      </div>

      </div>

      <div className="shrink-0 px-3 pb-4 pt-2">
        <nav className="flex flex-col gap-1">
          <NavItem to="/settings" icon={SettingsIcon} label="Settings" collapsed={!showLabels} />
          {isAdmin && <NavItem to="/admin" icon={SettingsIcon} label="Admin" collapsed={!showLabels} />}
        </nav>

        {/* Own identity, bottom of rail — mirrors where Instagram/TikTok
            anchor the account switcher on desktop, without pulling
            AccountSwitcher's full popover logic into this pass. */}
        <Link
          to={profileHref}
          title={!showLabels ? "Your profile" : undefined}
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
          title={`${collapsed ? "Pin sidebar open" : "Collapse sidebar"}${isLg ? "" : " (applies on wider screens)"}`}
          className="mt-2 w-full text-left text-xs text-ink-muted hover:text-ink px-3 py-1.5"
        >
          {showLabels ? (collapsed ? "Pin open »" : "« Collapse") : "»"}
        </button>
      </div>
    </aside>
    {pagesOpen && <ProfilePagesModal mode="owner" onClose={() => setPagesOpen(false)} />}
    </>
  );
}

