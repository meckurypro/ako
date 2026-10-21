// src/pages/PagePage.tsx
import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import {
  ArrowLeft,
  ArrowLeftRight,
  Building2,
  Eye,
  Layers,
  LayoutGrid,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Redo2,
  Share2,
  Sparkles,
  UserMinus,
  UserPlus,
  UserCog,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useIsRestricted } from "../hooks/useAccountAccess";
import { useMyProfile } from "../hooks/useProfile";
import { Avatar } from "../components/Avatar";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { PostCard } from "../components/PostCard";
import { BottomNav } from "../components/BottomNav";
import { DropdownMenu, type DropdownMenuItem } from "../components/DropdownMenu";
import { MediaViewer } from "../components/MediaViewer";
import { SwipeableTabs } from "../components/SwipeableTabs";
import { SlidingTabBar } from "../components/SlidingTabBar";
import { PageHero } from "../components/PageHero";
import { PageTeamShowcase } from "../components/PageTeamShowcase";
import { PostListSkeleton, ProjectMiniGridSkeleton } from "../components/ProfileSkeletons";
import { useToast } from "../components/Toast";
import {
  usePageByUsername,
  useIsFollowingPage,
  useMyPagePermissions,
  useTogglePageFollow,
  usePageSubsidiaries,
  useMyPages,
  useActiveIdentity,
  useSwitchActiveMode,
  usePageById,
} from "../hooks/usePages";
import { usePageFeaturedMembers, usePageHeroSlides } from "../hooks/usePageLanding";
import { usePagePosts } from "../hooks/usePosts";
import { usePageProjects } from "../hooks/useProjects";
import { useTabState } from "../hooks/useTabState";
import { ProjectMiniGrid } from "../components/ProjectMiniCard";
import { pageModeLabel } from "../lib/pageRoles";
import { useFeatureFlag } from "../hooks/useFeatureFlags";
import { APP_URL } from "../lib/appUrl";
import { useChangePulse } from "../hooks/useChangePulse";
import { useHidePageScrollbar } from "../lib/useHidePageScrollbar";

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

type PageTab = "projects" | "posts";

// Height of the sticky top bar. The tab bar docks right under it (top-14 === 56px).
const TOP_BAR_PX = 56;

const GLASS_BTN = "w-10 h-10 shrink-0 flex items-center justify-center rounded-full transition-colors";

function EmptyNote({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center mb-3">
        <Icon size={22} className="text-accent" />
      </div>
      <p className="text-ink-muted text-sm max-w-xs">{children}</p>
    </div>
  );
}

// /page/:username — a page's public landing view: banner, identity, hero slideshow, about,
// the team members its admins chose to show, then its projects and posts. Its feed is simply
// every post posted_as_page_id = this page (see usePagePosts), which is what naturally gives
// "cumulative activity of everyone managing it" without any separate aggregation.
export function PagePage() {
  // The page height changes a lot between the Projects and Posts tabs; keep the page scrollbar from popping in and out.
  useHidePageScrollbar();
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const restricted = useIsRestricted();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // Tapping the page's own NAME opens a quick switcher across every page you run.
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const nameButtonRef = useRef<HTMLButtonElement>(null);
  const [previewingAsVisitor, setPreviewingAsVisitor] = useState(false);
  const [viewer, setViewer] = useState<"avatar" | "banner" | null>(null);
  // The top bar starts see-through over the banner and turns solid (with the page name)
  // once you've scrolled past the identity block.
  const [scrolled, setScrolled] = useState(false);
  const [tabProgress, setTabProgress] = useState(0);
  const [tabDragging, setTabDragging] = useState(false);

  const { user } = useAuth();
  const { data: me } = useMyProfile();
  const { data: page, isLoading } = usePageByUsername(username!);
  // Restricted (consumer-only) accounts see a Page's projects only — never its posts.
  const { data: posts, isLoading: postsLoading } = usePagePosts(restricted ? "" : page?.id ?? "");
  const { data: projects, isLoading: projectsLoading } = usePageProjects(page?.id);
  const tabIds: PageTab[] = restricted ? ["projects"] : ["projects", "posts"];
  const [activeTab, setActiveTab] = useTabState<PageTab>(tabIds, "projects");
  const { data: myPages } = useMyPages();
  const { data: identity } = useActiveIdentity();
  const switchMode = useSwitchActiveMode();
  const isFollowingQuery = useIsFollowingPage(page?.id ?? "");
  const toggleFollow = useTogglePageFollow(page?.id ?? "");
  const { data: parentPage } = usePageById(page?.parent_organization_id ?? "", !!page?.parent_organization_id);
  const { data: subsidiaries } = usePageSubsidiaries(page?.id);
  const subsidiariesEnabled = useFeatureFlag("subsidiaries_enabled");
  const { data: slides } = usePageHeroSlides(page?.id);
  // Only the members an admin chose to show — a visitor's page load never fetches the full roster.
  const { data: featured } = usePageFeaturedMembers(page?.id);

  const isFollowing = !!isFollowingQuery.data;
  // The follower count ticks in quietly when it changes (index.css .ako-count-tick).
  const followersPulse = useChangePulse(page?.follower_count);
  // My own relationship to this page (membership, admin, permissions) comes from one small
  // query about ME — so nothing here needs the whole team list.
  const { data: myPagePerms, isLoading: permsLoading } = useMyPagePermissions(page?.id);
  const isMember = !!myPagePerms?.isMember;
  const isAdmin = !!myPagePerms?.isAdmin;
  // Admins can always edit; other members only if an admin granted "edit page details".
  const canEditPage = isAdmin || !!myPagePerms?.permissions.edit_page;
  // Editors see the setup hints and management shortcuts; "View as visitor" turns them off.
  const editorView = canEditPage && !previewingAsVisitor;
  // Following is something a PERSON does to a page. Never offered to the page's own team
  // (you'd be following yourself), and never while acting as a page — pages don't follow pages.
  const canFollowPage = !isMember && identity?.mode !== "page" && !(!!user && permsLoading);
  // Once you follow, the Follow/Following button is gone entirely — Unfollow lives in "…".
  const showFollowButton = canFollowPage && !isFollowing;

  const isActiveHere = identity?.mode === "page" && identity.page.id === page?.id;
  const switchablePages = (myPages ?? []).filter((p) => p.id !== page?.id);
  const canSwitchByName = isMember && switchablePages.length > 0;

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 150);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activeIndex = Math.max(tabIds.indexOf(activeTab), 0);
  useEffect(() => {
    setTabProgress(activeIndex);
  }, [activeIndex]);

  async function sharePage() {
    if (!page) return;
    const url = `${APP_URL}/page/${page.username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: page.name, url });
      } catch {
        // cancelled native share sheet
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast("Link copied.", { variant: "success" });
    }
  }

  function handleSwitchTo(pageId: string | null, destination: string) {
    setMenuOpen(false);
    setNameMenuOpen(false);
    switchMode.mutate(pageId, { onSuccess: () => navigate(destination) });
  }

  // Following is instant (the hook updates the screen first, plays the sound and reports a failure itself),
  // so there's nothing to wait on or announce here — the Follow button simply gives way.
  function handleFollow() {
    if (!page) return;
    if (!user) {
      navigate(`/login?redirect=/page/${page.username}`);
      return;
    }
    toggleFollow.mutate(false);
  }

  function handleUnfollow() {
    toggleFollow.mutate(true);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas pb-24">
        <div className="max-w-xl md:max-w-3xl mx-auto">
          <div className="aspect-[8/3] w-full bg-surface animate-pulse" />
          <div className="px-4">
            <div className="-mt-12 h-28 w-28 rounded-full bg-border ring-4 ring-canvas animate-pulse" />
            <div className="mt-4 h-7 w-48 rounded-lg bg-surface animate-pulse" />
            <div className="mt-2 h-4 w-32 rounded-lg bg-surface animate-pulse" />
          </div>
        </div>
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

  const menuItems: (DropdownMenuItem | "divider")[] = [
    {
      key: "share",
      label: `Share ${pageModeLabel(page.page_type).toLowerCase()}`,
      icon: <Redo2 />,
      onSelect: () => void sharePage(),
    },
    ...(isMember && isActiveHere
      ? ([
          {
            key: "switch-personal",
            label: `Switch to ${me?.display_name ?? "personal"}`,
            icon: <ArrowLeftRight />,
            onSelect: () => handleSwitchTo(null, me ? `/profile/${me.username}` : "/feed"),
          },
        ] satisfies DropdownMenuItem[])
      : []),
    ...(isMember && !isActiveHere
      ? ([
          {
            key: "switch-page",
            label: `Switch to ${page.name}`,
            icon: <ArrowLeftRight />,
            onSelect: () => handleSwitchTo(page.id, `/page/${page.username}`),
          },
        ] satisfies DropdownMenuItem[])
      : []),
    ...(canEditPage
      ? ([
          {
            key: "edit",
            label: "Edit page",
            icon: <Pencil />,
            onSelect: () => navigate(`/page/${page.username}/edit`),
          },
          {
            key: "preview",
            label: previewingAsVisitor ? "Exit visitor view" : "View as visitor",
            icon: <Eye />,
            onSelect: () => setPreviewingAsVisitor((v) => !v),
          },
        ] satisfies DropdownMenuItem[])
      : []),
    ...(isAdmin
      ? ([
          {
            key: "team",
            label: "Manage team",
            icon: <UserCog />,
            onSelect: () => navigate(`/page/${page.username}/team`),
          },
        ] satisfies DropdownMenuItem[])
      : []),
    ...(isAdmin && subsidiariesEnabled && !restricted
      ? ([
          {
            key: "subsidiary",
            label: "Add Subsidiary",
            icon: <Building2 />,
            onSelect: () => navigate(`/pages/new?parent=${page.id}`),
          },
        ] satisfies DropdownMenuItem[])
      : []),
    // Following has no button of its own once you follow — this is where it lives.
    ...(canFollowPage && isFollowing
      ? (["divider", {
          key: "unfollow",
          label: "Unfollow",
          icon: <UserMinus />,
          variant: "danger",
          onSelect: handleUnfollow,
        }] satisfies (DropdownMenuItem | "divider")[])
      : []),
  ];

  const hasSlides = (slides?.length ?? 0) > 0;
  const hasFeatured = (featured?.length ?? 0) > 0;
  // What an editor could still add to make the page feel finished.
  const setupSteps = [
    !page.cover_url && { key: "banner", label: "Add a banner", to: `/page/${page.username}/edit` },
    !hasSlides && { key: "hero", label: "Add hero slides", to: `/page/${page.username}/edit` },
    isAdmin && !hasFeatured && { key: "team", label: "Choose who appears in “Meet the team”", to: `/page/${page.username}/team` },
  ].filter(Boolean) as { key: string; label: string; to: string }[];

  const topBtn = scrolled ? "text-ink hover:bg-ink/5" : "bg-black/35 text-white backdrop-blur-md";

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Top bar — floats over the banner, then solidifies and shows the page name. It stays
          reachable all the way down because "…" is where Unfollow (and the team's tools) live. */}
      <div
        className={`sticky top-0 z-chrome -mb-14 h-14 transition-[background-color,border-color,backdrop-filter] duration-200 border-b ${
          scrolled ? "bg-canvas/90 backdrop-blur-md border-border" : "bg-transparent border-transparent"
        }`}
      >
        <div className="max-w-xl md:max-w-3xl mx-auto h-full px-3 flex items-center gap-1">
          <button onClick={smartBack} aria-label="Back" className={`${GLASS_BTN} ${topBtn}`}>
            <ArrowLeft size={22} />
          </button>

          <div
            className={`flex-1 min-w-0 flex items-center gap-2 px-1 transition-opacity duration-200 ${
              scrolled ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            aria-hidden={!scrolled}
          >
            <Avatar src={page.avatar_url} name={page.name} size="sm" />
            <span className="truncate text-sm font-semibold text-ink">{page.name}</span>
          </div>

          {/* Only while actually ACTING as this page — a member who hasn't switched into it yet
              posts as themselves, so this living here keeps "what I create next" matched to
              "who I'm posting as right now". */}
          {isActiveHere && !restricted && (
            <Link to="/create" aria-label="Create" className={`${GLASS_BTN} ${topBtn}`}>
              <Plus size={22} />
            </Link>
          )}
          <button
            ref={menuButtonRef}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Page options"
            className={`${GLASS_BTN} ${topBtn}`}
          >
            <MoreHorizontal size={22} />
          </button>
          {menuOpen && (
            <DropdownMenu title={page.name} anchorRef={menuButtonRef} onClose={() => setMenuOpen(false)} items={menuItems} />
          )}
        </div>
      </div>

      <div className="max-w-xl md:max-w-3xl mx-auto">
        {/* Banner */}
        <div className="relative aspect-[8/3] w-full overflow-hidden bg-accent-soft md:rounded-b-3xl">
          {page.cover_url ? (
            <button
              type="button"
              onClick={() => setViewer("banner")}
              aria-label="View banner"
              className="block h-full w-full"
            >
              <img src={page.cover_url} alt="" className="h-full w-full object-cover" />
            </button>
          ) : (
            <div
              aria-hidden
              className="h-full w-full"
              style={{
                background:
                  "radial-gradient(120% 140% at 85% 0%, color-mix(in srgb, var(--color-brand-orange) 28%, transparent), transparent 60%), linear-gradient(135deg, var(--color-accent-soft), var(--color-canvas))",
              }}
            />
          )}
          {/* Keeps the white top-bar buttons legible on any banner image. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />
        </div>

        {previewingAsVisitor && canEditPage && (
          <div className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-xl bg-accent-soft px-4 py-2.5 text-sm text-accent">
            <span className="flex items-center gap-1.5">
              <Eye size={14} />
              Viewing as a visitor sees it
            </span>
            <button
              onClick={() => setPreviewingAsVisitor(false)}
              className="flex items-center gap-1 font-medium"
              aria-label="Exit visitor view"
            >
              <X size={14} />
              Exit
            </button>
          </div>
        )}

        {/* Identity */}
        <div className="px-4">
          <div className="-mt-12 flex items-end justify-between gap-3">
            {page.avatar_url ? (
              <button
                type="button"
                onClick={() => setViewer("avatar")}
                aria-label="View page photo"
                className="relative block rounded-full bg-canvas ring-4 ring-canvas"
              >
                <Avatar src={page.avatar_url} name={page.name} size="2xl" />
              </button>
            ) : (
              <span className="relative block rounded-full bg-canvas ring-4 ring-canvas">
                <Avatar src={page.avatar_url} name={page.name} size="2xl" />
              </span>
            )}

            <div className="flex items-center gap-2 pb-1">
              {showFollowButton && (
                <button
                  type="button"
                  onClick={handleFollow}
                  className="ako-follow-swap inline-flex h-11 items-center gap-2 rounded-full bg-cta px-6 text-[15px] font-semibold text-white transition-transform active:scale-[0.97]"
                >
                  <UserPlus size={18} />
                  Follow
                </button>
              )}
              {editorView && (
                <Link
                  to={`/page/${page.username}/edit`}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-5 text-[15px] font-semibold text-ink transition-transform active:scale-[0.97]"
                >
                  <Pencil size={16} />
                  Edit page
                </Link>
              )}
              <button
                type="button"
                onClick={() => void sharePage()}
                aria-label="Share"
                title="Share"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-ink transition-transform active:scale-[0.95]"
              >
                <Share2 size={19} />
              </button>
            </div>
          </div>

          <div className="mt-3 relative">
            <button
              ref={nameButtonRef}
              type="button"
              onClick={() => canSwitchByName && setNameMenuOpen((o) => !o)}
              disabled={!canSwitchByName}
              className="flex max-w-full items-center gap-2 text-left"
            >
              <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-ink break-words">
                {page.name}
              </h1>
            </button>
            {nameMenuOpen && (
              <DropdownMenu
                title="Switch page"
                anchorRef={nameButtonRef}
                onClose={() => setNameMenuOpen(false)}
                items={switchablePages.map((p) => ({
                  key: p.id,
                  label: p.name,
                  icon: <Avatar src={p.avatar_url} name={p.name} size="sm" />,
                  onSelect: () => handleSwitchTo(p.id, `/page/${p.username}`),
                }))}
              />
            )}
          </div>
          {page.is_verified && <VerifiedBadge size={15} label className="mt-1" />}
          <p className="mt-1 text-sm text-ink-muted">
            {pageModeLabel(page.page_type)} · @{page.username}
          </p>
          {page.tagline && <p className="mt-2 text-base leading-snug text-ink">{page.tagline}</p>}
          {parentPage && (
            <p className="mt-1.5 text-xs text-ink-muted">
              A Subsidiary of{" "}
              <Link to={`/page/${parentPage.username}`} className="font-medium text-accent">
                {parentPage.name}
              </Link>
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-sm text-ink">
              <strong className="tabular-nums"><span className={followersPulse ? "ako-count-tick" : ""}>{page.follower_count}</span></strong>{" "}
              <span className="text-ink-muted">{page.follower_count === 1 ? "follower" : "followers"}</span>
            </span>
            {page.website_url && (
              <a
                href={getWebsiteHref(page.website_url)}
                target="_blank"
                rel="noopener noreferrer"
                title={page.website_url}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent"
              >
                <Link2 size={14} className="shrink-0" />
                <span className="truncate">{getWebsiteDomain(page.website_url)}</span>
              </a>
            )}
          </div>
        </div>

        {/* Landing sections */}
        <div className="mt-8 space-y-9 px-4">
          {editorView && setupSteps.length > 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Sparkles size={16} className="text-brand-orange" />
                Make your page stand out
              </p>
              <p className="mt-1 text-xs text-ink-muted">Only your team sees this. Visitors see the finished page.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {setupSteps.map((s) => (
                  <Link
                    key={s.key}
                    to={s.to}
                    className="rounded-full bg-accent-soft px-3.5 py-2 text-sm font-medium text-accent"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {hasSlides && (
            <PageHero
              slides={slides!}
              autoplay={page.hero_autoplay ?? true}
              intervalSeconds={page.hero_interval_seconds ?? 5}
              direction={page.hero_direction ?? "forward"}
              pageName={page.name}
            />
          )}

          {page.bio && (
            <section aria-labelledby="page-about-heading">
              <h2 id="page-about-heading" className="font-display text-xl font-semibold tracking-tight text-ink">
                About
              </h2>
              <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink">{page.bio}</p>
            </section>
          )}

          {hasFeatured && <PageTeamShowcase members={featured!} />}

          {subsidiaries && subsidiaries.length > 0 && (
            <section aria-labelledby="page-subs-heading">
              <h2 id="page-subs-heading" className="font-display text-xl font-semibold tracking-tight text-ink">
                Subsidiaries
              </h2>
              <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4">
                {subsidiaries.map((s) => (
                  <Link
                    key={s.id}
                    to={`/page/${s.username}`}
                    className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center"
                  >
                    <Avatar src={s.avatar_url} name={s.name} size="vn" />
                    <span className="w-full truncate text-xs text-ink-muted">{s.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Projects / Posts — icon-led tabs with a sliding indicator, same as a personal profile. */}
        <div className="mt-8">
          <div className="sticky z-subchrome bg-canvas px-4" style={{ top: TOP_BAR_PX }}>
            <SlidingTabBar
              tabs={tabIds.map((t) => ({ id: t, label: t === "posts" ? "Posts" : "Projects" }))}
              activeIndex={activeIndex}
              progress={tabProgress}
              dragging={tabDragging}
              onSelect={(i) => setActiveTab(tabIds[i])}
              ariaLabel={`${page.name} content`}
            />
          </div>

          <div className="mt-3 px-4">
            <SwipeableTabs
              // A tab change must never move the page (same as the profile).
              restoreScroll={false}
              index={activeIndex}
              onIndexChange={(i) => setActiveTab(tabIds[i])}
              onProgress={(progress, dragging) => {
                setTabProgress(progress);
                setTabDragging(dragging);
              }}
            >
              {tabIds.map((t) =>
                t === "projects" ? (
                  <div key="projects">
                    {projectsLoading ? (
                      <ProjectMiniGridSkeleton />
                    ) : !projects || projects.length === 0 ? (
                      <EmptyNote icon={Layers}>
                        {isMember
                          ? `No projects yet — switch to ${page.name} and tap + to publish the first one.`
                          : `${page.name} hasn't published any projects yet.`}
                      </EmptyNote>
                    ) : (
                      <ProjectMiniGrid projects={projects} showStatus={isMember} />
                    )}
                  </div>
                ) : (
                  <div key="posts" className="-mx-4">
                    {postsLoading ? (
                      <PostListSkeleton />
                    ) : !posts || posts.length === 0 ? (
                      <EmptyNote icon={LayoutGrid}>{page.name} hasn't posted anything yet.</EmptyNote>
                    ) : (
                      posts.map((post) => <PostCard key={post.id} post={post} />)
                    )}
                  </div>
                )
              )}
            </SwipeableTabs>
          </div>
        </div>
      </div>

      <BottomNav />

      {viewer === "avatar" && page.avatar_url && (
        <MediaViewer mediaUrls={[page.avatar_url]} startIndex={0} onClose={() => setViewer(null)} />
      )}
      {viewer === "banner" && page.cover_url && (
        <MediaViewer mediaUrls={[page.cover_url]} startIndex={0} onClose={() => setViewer(null)} />
      )}

    </div>
  );
}
