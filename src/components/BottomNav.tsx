import type { ComponentType } from "react";
import { Link, NavLink, useMatch } from "react-router-dom";
import { Search, LibraryBig, Users, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useIsRestricted } from "../hooks/useAccountAccess";
import { useAutoHideOnScroll } from "../hooks/useAutoHideOnScroll";
import { useUnreadConversationCount } from "../hooks/useMessaging";
import { usePageInboxUnreadCount } from "../hooks/usePageInbox";
import { useActiveIdentity } from "../hooks/usePages";

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

// Bottom nav order. Unrestricted accounts: Feed · Discover · Library ·
// Connect · Profile. Restricted (consumer-only) accounts have no Feed and
// land on Discover, so Discover is first for them: Discover · Library ·
// Connect · Profile. Messages no longer has
// a tab — it's the floating chat button above the nav (see ChatFab below).
// "Connect" is the home for Events, Meetings, Rooms and Affiliates (see
// pages/Connect.tsx).
const feedItem = { to: "/feed", icon: FeedIcon, label: "Feed" } as const;
const discoverItem = { to: "/topics", icon: Search, label: "Discover" } as const;
const libraryItem = { to: "/library", icon: LibraryBig, label: "Library" } as const;
const connectItem = { to: "/connect", icon: Users, label: "Connect" } as const;

const fullNavItems = [feedItem, discoverItem, libraryItem, connectItem] as const;
const restrictedNavItems = [discoverItem, libraryItem, connectItem] as const;

// Solid chat bubble with a "+" knocked out of it — the same glyph the
// reference design uses for its floating new-chat button. Square top-left
// corner is the bubble's "tail"; the rest of the outline is rounded.
function ChatPlusIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.5 3.5H18a3.5 3.5 0 0 1 3.5 3.5v8a3.5 3.5 0 0 1-3.5 3.5H6A3.5 3.5 0 0 1 2.5 15V3.5Z"
        fill="currentColor"
      />
      <path d="M12 7.5v7M8.5 11h7" className="stroke-accent dark:stroke-ink" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

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
  // Fades and slides off the bottom edge on scroll-down, right back on
  // scroll-up — see useAutoHideOnScroll for the shared threshold logic
  // (also used by AutoHideTopBar for the top chrome).
  const visible = useAutoHideOnScroll();
  const restricted = useIsRestricted();
  const { user, profile } = useAuth();
  const { data: identity } = useActiveIdentity();
  const activePageId = identity?.mode === "page" ? identity.page.id : undefined;
  const personalUnread = useUnreadConversationCount();
  const pageUnread = usePageInboxUnreadCount(activePageId);
  const unreadCount = activePageId ? pageUnread : personalUnread;

  // Compare the :username in the URL to OUR OWN username — not a path
  // prefix match — so this is only active on our own profile, never
  // on someone else's, and works regardless of /me's redirect.
  const profileMatch = useMatch("/profile/:username/*");
  // /me redirects to /page/:username instead of /profile/:username while
  // acting as a page (see MyProfileRedirect) — match that too, but only
  // against the page currently acting-as, never any other page someone
  // just happens to be viewing.
  const pageMatch = useMatch("/page/:username/*");
  const isOwnProfileActive =
    (!!profile?.username && profileMatch?.params.username === profile.username) ||
    (identity?.mode === "page" && pageMatch?.params.username === identity.page.username);

  // Same idea for Messages: /inbox redirects to /page-inbox while
  // acting as a page instead of /messages (see MyInboxRedirect) — match
  // both so the tab still lights up regardless of which one it landed on.
  const messagesMatch = useMatch("/messages/*");
  const pageInboxMatch = useMatch("/page-inbox/*");
  const isMessagesActive = !!messagesMatch || !!pageInboxMatch;

  // The chat button points at the messages list, so it's redundant (and
  // would sit on top of the conversation list) while already in messaging.
  const showChatFab = !isMessagesActive;
  const inboxHref = activePageId ? "/page-inbox" : "/inbox";

  const navList = restricted ? restrictedNavItems : fullNavItems;

  // Signed-out visitors (e.g. a shared project link) get no app chrome at all —
  // no tabs, no floating chat button. All hooks above run unconditionally.
  if (!user) return null;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-1 w-14 text-[11px] font-medium transition-colors ${
      isActive ? "text-accent" : "text-ink-muted"
    }`;

  return (
    <nav
      id="ako-bottom-nav"
      // md:hidden: desktop's persistent Sidebar (see AppShell.tsx) is the
      // navigation spine there — this bar stays exactly as-is below md.
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-md rounded-t-[28px] border-t border-border shadow-[0_-1px_3px_rgba(var(--shadow-ink-rgb),0.06)] px-2 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] transition-[transform,opacity] duration-300 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      }`}
    >
      {/* Floating chat button — pinned just above the nav's right edge and
          moves with it when the nav auto-hides on scroll. */}
      {showChatFab && (
        <Link
          to={inboxHref}
          aria-label={unreadCount > 0 ? `Chats, ${unreadCount} unread` : "Chats"}
          className="absolute right-4 bottom-full mb-4 w-14 h-14 rounded-[18px] bg-accent text-canvas dark:bg-ink dark:text-accent flex items-center justify-center shadow-[0_4px_14px_rgba(var(--shadow-ink-rgb),0.25)] active:scale-95 transition-transform"
        >
          <ChatPlusIcon />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-danger text-canvas text-[10px] font-medium rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      )}

      <div className="flex items-center justify-around">
        {navList.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} replace className={linkClass}>
            {({ isActive }) => (
              <>
                <NavIcon Icon={Icon} isActive={isActive} />
                {label}
              </>
            )}
          </NavLink>
        ))}

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
