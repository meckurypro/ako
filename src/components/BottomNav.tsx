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

// Two overlapping speech bubbles — a solid one in front carrying the "typing" dots, a softer one behind — so it reads
// as a conversation, not a single comment (the post's comment action is a bubble with a "+", which this used to copy).
// A thin ring in the button's own colour separates the front bubble from the one behind it.
function ChatIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 2.5H18A3.5 3.5 0 0 1 21.5 6V16.5L17.8 12.5H11A3.5 3.5 0 0 1 7.5 9V6A3.5 3.5 0 0 1 11 2.5Z" fill="currentColor" opacity={0.5} />
      <path d="M6 7.5H13A3.5 3.5 0 0 1 16.5 11V14A3.5 3.5 0 0 1 13 17.5H8.5L3.2 21.5L2.5 17.5V11A3.5 3.5 0 0 1 6 7.5Z" className="stroke-accent dark:stroke-ink" strokeWidth="3.2" strokeLinejoin="round" />
      <path d="M6 7.5H13A3.5 3.5 0 0 1 16.5 11V14A3.5 3.5 0 0 1 13 17.5H8.5L3.2 21.5L2.5 17.5V11A3.5 3.5 0 0 1 6 7.5Z" fill="currentColor" />
      <g className="fill-accent dark:fill-ink">
        <circle cx="6.4" cy="12.5" r="1.2" />
        <circle cx="9.5" cy="12.5" r="1.2" />
        <circle cx="12.6" cy="12.5" r="1.2" />
      </g>
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
  // /me itself counts too: it's only on screen while the redirect resolves, and
  // the Profile tab should already read as selected then (no flash of "none").
  const meMatch = useMatch("/me");
  const isOwnProfileActive =
    !!meMatch ||
    (!!profile?.username && profileMatch?.params.username === profile.username) ||
    (identity?.mode === "page" && pageMatch?.params.username === identity.page.username);

  // The chat button is a shortcut for browsing, not a fixture: it shows only on the five tab screens (Feed, Discover,
  // Library, Connect, your own Profile). Anywhere you are doing something — a project, a request, a wallet screen, a
  // thread — it stays out of the way.
  const feedMatch = useMatch("/feed");
  const topicsMatch = useMatch("/topics");
  const libraryMatch = useMatch("/library");
  const connectMatch = useMatch("/connect");
  const showChatFab = !!(feedMatch || topicsMatch || libraryMatch || connectMatch || isOwnProfileActive);
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
          <ChatIcon size={30} />
          {unreadCount > 0 && (
            <span className="pointer-events-none absolute -top-[9px] -right-[9px] min-w-6 h-6 px-[5px] rounded-full border-[2.5px] border-canvas bg-[#D8453A] text-white text-[11px] leading-[13px] font-semibold tabular-nums flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
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
