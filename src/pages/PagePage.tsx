// src/pages/PagePage.tsx
import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft, ArrowLeftRight, BadgeCheck, Check, ChevronDown, Globe, MoreHorizontal, Redo2, Users, UserCog } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useMyProfile } from "../hooks/useProfile";
import { Avatar } from "../components/Avatar";
import { PostCard } from "../components/PostCard";
import { BottomNav } from "../components/BottomNav";
import {
  usePageByUsername,
  useIsFollowingPage,
  useTogglePageFollow,
  usePageMembers,
  useMyPages,
  useActiveIdentity,
  useSwitchActiveMode,
} from "../hooks/usePages";
import { usePagePosts } from "../hooks/usePosts";
import { pageModeLabel } from "../lib/pageRoles";

function getWebsiteHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function getWebsiteDomain(url: string): string {
  try {
    return new URL(getWebsiteHref(url)).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//i, "").split("/")[0];
  }
}

// /page/:username — a page's public profile. Its feed is simply every
// post posted_as_page_id = this page (see usePagePosts), which is
// what naturally gives "cumulative activity of everyone managing it"
// without any separate aggregation.
export function PagePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Separate from the "…" menu above — tapping the page's own NAME
  // opens a quick switcher scoped to pages of the SAME type (org ↔
  // org, brand ↔ brand only), the way tapping your handle in
  // IG/TikTok pops up "Switch accounts". Own open state + outside-tap
  // ref, same pattern as the "…" menu just above.
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const nameMenuRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { data: me } = useMyProfile();
  const { data: page, isLoading } = usePageByUsername(username!);
  const { data: members } = usePageMembers(page?.id ?? "");
  const { data: posts } = usePagePosts(page?.id ?? "");
  const { data: myPages } = useMyPages();
  const { data: identity } = useActiveIdentity();
  const switchMode = useSwitchActiveMode();
  const isFollowingQuery = useIsFollowingPage(page?.id ?? "");
  const toggleFollow = useTogglePageFollow(page?.id ?? "");

  const isFollowing = !!isFollowingQuery.data;
  const myMembership = members?.find((m) => m.user_id === user?.id && m.status === "active");
  const isMember = !!myMembership;
  const isAdmin = !!myMembership?.is_admin;
  const activeMembers = (members ?? []).filter((m) => m.status === "active");

  // Am I currently acting AS this page? Drives whether the menu offers
  // "switch to it" or "switch back to personal/elsewhere".
  const isActiveHere = identity?.mode === "page" && identity.page.id === page?.id;
  // The other pages I run, for a quick "switch to X" shortcut without
  // having to go back through /pages first.
  const otherPages = (myPages ?? []).filter((p) => p.id !== page?.id);
  // Same-type pages (every organisation you run, if this is one — or
  // every brand, if this is one) — what tapping the NAME switches
  // between. Only worth making the name tappable when there's more
  // than one to choose from.
  const samePlatformPages = (myPages ?? []).filter((p) => p.page_type === page?.page_type);
  const canSwitchByName = isMember && samePlatformPages.length > 1;

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!nameMenuOpen) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (nameMenuRef.current && !nameMenuRef.current.contains(e.target as Node)) {
        setNameMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [nameMenuOpen]);

  async function sharePage() {
    if (!page) return;
    const url = `${window.location.origin}/page/${page.username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: page.name, url });
      } catch {
        // cancelled native share sheet
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  function handleShare() {
    setMenuOpen(false);
    void sharePage();
  }

  function handleSwitchTo(pageId: string | null, destination: string) {
    setMenuOpen(false);
    setNameMenuOpen(false);
    switchMode.mutate(pageId, { onSuccess: () => navigate(destination) });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-6 text-center">
        <p className="text-ink-muted">This page doesn't exist, or is no longer active.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between px-4 pt-4">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>

          {/* Mode-aware "…" — content depends on the viewer's relationship
              to this specific page (visitor / member / currently acting as
              it), not a fixed set of options. */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-2 text-ink-muted"
              aria-label="Page options"
            >
              <MoreHorizontal size={20} />
            </button>

            {menuOpen && (
              <div className="absolute top-full right-0 mt-1 bg-canvas border border-border rounded-xl shadow-lg py-1 w-60 z-10">
                <button
                  onClick={handleShare}
                  className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
                >
                  <Redo2 size={16} />
                  Share {pageModeLabel(page.page_type).toLowerCase()}
                </button>

                {isMember && isActiveHere && (
                  <button
                    onClick={() => handleSwitchTo(null, me ? `/profile/${me.username}` : "/feed")}
                    className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
                  >
                    <ArrowLeftRight size={16} />
                    Switch to personal
                  </button>
                )}

                {isMember && !isActiveHere && (
                  <button
                    onClick={() => handleSwitchTo(page.id, `/page/${page.username}`)}
                    className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
                  >
                    <ArrowLeftRight size={16} />
                    Switch to {page.name}
                  </button>
                )}

                {isMember &&
                  otherPages.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSwitchTo(p.id, `/page/${p.username}`)}
                      className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
                    >
                      <Avatar src={p.avatar_url} name={p.name} size="sm" />
                      <span className="truncate">Switch to {p.name}</span>
                    </button>
                  ))}

                {isAdmin && (
                  <Link
                    to={`/page/${page.username}/team`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface"
                  >
                    <UserCog size={16} />
                    Manage team
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pt-3 pb-4">
          <div className="flex items-start gap-4">
            <Avatar src={page.avatar_url} name={page.name} size="xl" />
            <div className="flex-1 min-w-0 pt-1">
              <div ref={nameMenuRef} className="relative inline-block max-w-full">
                <button
                  type="button"
                  onClick={() => canSwitchByName && setNameMenuOpen((o) => !o)}
                  disabled={!canSwitchByName}
                  className="flex items-center gap-1.5 max-w-full"
                >
                  <h1 className="font-display text-lg text-ink truncate">{page.name}</h1>
                  {page.is_verified && <BadgeCheck size={16} className="text-accent flex-shrink-0" />}
                  {canSwitchByName && <ChevronDown size={14} className="text-ink-muted flex-shrink-0" />}
                </button>

                {/* Same-type switcher — every organisation you run if this
                    page is one, every brand if it's one. Tapping a row
                    switches straight into it, same as the "…" menu's
                    per-page rows, just scoped and reached the IG/TikTok
                    way: tap the name itself. */}
                {nameMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-canvas border border-border rounded-xl shadow-lg py-1 w-56 z-10">
                    {samePlatformPages.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSwitchTo(p.id, `/page/${p.username}`)}
                        className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
                      >
                        <Avatar src={p.avatar_url} name={p.name} size="sm" />
                        <span className="flex-1 min-w-0 truncate">{p.name}</span>
                        {p.id === page.id && <Check size={14} className="text-accent flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-ink-muted">
                {pageModeLabel(page.page_type)} · @{page.username}
              </p>
              {page.tagline && <p className="text-sm text-ink mt-1">{page.tagline}</p>}
            </div>
          </div>

          {page.bio && <p className="text-sm text-ink mt-3 whitespace-pre-wrap">{page.bio}</p>}

          {page.website_url && (
            <a
              href={getWebsiteHref(page.website_url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-accent mt-2"
            >
              <Globe size={14} />
              {getWebsiteDomain(page.website_url)}
            </a>
          )}

          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="text-ink">
              <strong>{page.follower_count}</strong> <span className="text-ink-muted">followers</span>
            </span>
            <Link to={`/page/${page.username}/team`} className="flex items-center gap-1 text-ink-muted">
              <Users size={14} />
              {activeMembers.length} on the team
            </Link>
          </div>

          <button
            type="button"
            onClick={() => (user ? toggleFollow.mutate(isFollowing) : navigate(`/login?redirect=/page/${page.username}`))}
            disabled={toggleFollow.isPending}
            className={`w-full mt-4 rounded-xl py-2.5 text-sm font-medium ${
              isFollowing ? "bg-surface text-ink" : "bg-accent text-canvas"
            }`}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>

          {activeMembers.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">Team</p>
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {activeMembers.slice(0, 8).map((m) => (
                  <Link
                    key={m.id}
                    to={`/profile/${m.profile.username}`}
                    className="flex flex-col items-center gap-1 flex-shrink-0 w-16 text-center"
                  >
                    <Avatar src={m.profile.avatar_url} name={m.profile.display_name} size="md" />
                    <span className="text-[11px] text-ink-muted truncate w-full">{m.role_label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border">
          {!posts || posts.length === 0 ? (
            <p className="text-ink-muted text-center py-14 text-sm">
              {page.name} hasn't posted anything yet.
            </p>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
