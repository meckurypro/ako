// src/pages/ProfilePage.tsx
import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Wallet, MessageCircle, MoreHorizontal, Plus, Eye, X, UserCheck, UserPlus, Lock, Building2, Undo2, ChevronDown, UserMinus, Bell, BellOff, Briefcase, Clock, Pencil, Share2, Menu, Link2, Ban, Layers, LayoutGrid, RefreshCw, Activity as ActivityIcon, type LucideIcon } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProjectOwnership } from "../hooks/useProjectOwnership";
import {
  useProfileByUsername,
  useIsFollowingAsActiveIdentity,
  useIsFollowedByUser,
  useToggleFollowAsActiveIdentity,
} from "../hooks/useProfile";
import { useTabState } from "../hooks/useTabState";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { SwipeableTabs } from "../components/SwipeableTabs";
import { DropdownMenu, type DropdownMenuItem } from "../components/DropdownMenu";
import {
  useHasPendingFollowRequest,
  useSendFollowRequest,
  useCancelFollowRequest,
  useIncomingFollowRequestCount,
} from "../hooks/useFollowRequests";
import { useUserPostsWithArchived } from "../hooks/usePosts";
import { useStartConversation } from "../hooks/useMessaging";
import { useIsBlocked, useToggleBlock, useIsMuted, useToggleMute, useRemoveFollower } from "../hooks/usePrivacy";
import { useContactNickname } from "../hooks/useContactNicknames";
import { useUserProjects } from "../hooks/useProjects";
import type { ProjectType } from "../hooks/useProjects";
import {
  usePortfolioCategories,
  usePortfolioCategoryProjects,
  usePortfolioCategoryGigs,
  useCategorizedProjectIds,
  useTypePortfolioCategories,
  useTypeCategoryProjects,
  useCollaboratorMediaProjects,
} from "../hooks/usePortfolio";
import { useRecordProfileVisit } from "../hooks/useProfileVisits";
import { Avatar } from "../components/Avatar";
import { AccountSwitcher } from "../components/AccountSwitcher";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { BadgeStreakNote } from "../components/BadgeStreakNote";
import { MediaViewer } from "../components/MediaViewer";
import { ShareProfileSheet } from "../components/ShareProfileSheet";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ReportModal } from "../components/ReportModal";
import { ProfileShareScreen } from "../components/ProfileShareScreen";
import { useToast } from "../components/Toast";
import { TierBadge } from "../components/TierBadge";
import { RoleTags } from "../components/RoleTags";
import { PostCard } from "../components/PostCard";
import { ProjectCard } from "../components/ProjectCard";
import { ProjectMiniCard, ProjectMiniGrid } from "../components/ProjectMiniCard";
import { PostListSkeleton, ProfilePageSkeleton, ProjectMiniGridSkeleton } from "../components/ProfileSkeletons";
import { BottomNav } from "../components/BottomNav";
import { ProfileAdSlot } from "../components/ProfileAdSlot";
import { ProfilePagesModal } from "../components/ProfilePagesModal";
import { useProfilePages } from "../hooks/usePages";
import { useCanFollow, useIsRestricted } from "../hooks/useAccountAccess";
import { useChangePulse } from "../hooks/useChangePulse";
import { APP_URL } from "../lib/appUrl";
import { usePrimaryFloatingAction } from "../lib/floatingChrome";
import { profileTabIcon } from "../lib/profileTabIcons";
import { useHidePageScrollbar } from "../lib/useHidePageScrollbar";

// Website links are saved in full (whatever the user pastes, including
// long query strings), but only the bare domain is ever shown — the
// full URL still opens on click via getWebsiteHref. Handles input with
// or without a protocol ("meckury.ai/..." or "https://meckury.ai/...").
function getWebsiteHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function getWebsiteDomain(url: string): string {
  try {
    return new URL(getWebsiteHref(url)).hostname.replace(/^www\./, "");
  } catch {
    // Malformed input (shouldn't normally happen) — best-effort fallback
    return url.replace(/^https?:\/\//i, "").split("/")[0];
  }
}

// AKỌ_DYNAMIC_PROFILE_PORTFOLIOS_AND_GIG_SYSTEM spec: Posts is present for
// every full-access account (restricted consumer-only accounts see projects
// only); everything else is derived per-profile from the account's
// active Gigs (see usePortfolioCategories) plus a "projects" fallback
// for non-gig work that hasn't been categorized yet (spec section 44
// — a deliberate fallback, never a dumping ground merely because
// migration is inconvenient). The owner's tickets/meetings/room
// activity has its own home in the Activity hub, not a tab here.
type ProfileTab = string;

function categoryToTabId(category: string): string {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// One dynamic category's content pane — its own component (not a loop
// inside ProfilePage) so each tab can call its own data hook without
// breaking the rules of hooks across a variable-length tab list.
function PortfolioCategoryPane({
  accountId,
  category,
  showOwnerView,
}: {
  accountId: string;
  category: string;
  showOwnerView: boolean;
}) {
  const { data: projects, isLoading } = usePortfolioCategoryProjects(accountId, category);
  // The gig page(s) this category's work samples are proof-of-work
  // for (e.g. the "Music Artist" gig behind an "Artist" tab) —
  // previously nothing on the profile linked to these at all, only
  // to the samples below. Shown as a compact rail up top so a
  // visitor can reach "Message to inquire" / pricing / the full
  // sample set from the gig's own page, not only piece by piece.
  const { data: gigs } = usePortfolioCategoryGigs(accountId, category);
  if (isLoading) return <ProjectMiniGridSkeleton />;
  if (!projects || projects.length === 0) {
    // Shouldn't normally be reachable — the tab itself only appears
    // when the aggregate query found eligible work — but cache
    // staleness between the two queries is possible, so fail quiet
    // rather than showing a broken-looking empty tab.
    return <EmptyNote icon={Layers}>Nothing here yet.</EmptyNote>;
  }
  return (
    <>
      {gigs && gigs.length > 0 && (
        <div className="mb-4 -mt-1">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {gigs.map((gig) => (
              <ProjectMiniCard key={gig.id} project={gig} />
            ))}
          </div>
        </div>
      )}
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} isOwnerView={showOwnerView} manageContent={showOwnerView} />
      ))}
    </>
  );
}

// The type-based half of the dynamic tab set (spec section 2/44) —
// for Book/Course/Event/Room/File, which don't route through a
// professional Gig role at all. See useTypePortfolioCategories.
function TypeCategoryPane({
  accountId,
  projectType,
  showOwnerView,
}: {
  accountId: string;
  projectType: ProjectType;
  showOwnerView: boolean;
}) {
  const { data: projects, isLoading } = useTypeCategoryProjects(accountId, projectType);
  // Skeleton tiles (not a blank pane, not a page-wide overlay) while just this tab's data loads.
  if (isLoading) return <ProjectMiniGridSkeleton projectType={projectType} />;
  if (!projects || projects.length === 0) {
    return <EmptyNote icon={Layers}>Nothing here yet.</EmptyNote>;
  }
  // Books: compact 2-up cover grid (same tiles as Discover/search). Tapping a card opens the book's own
  // slug page, where the full details, buy/download and owner controls live.
  if (projectType === "book") return <ProjectMiniGrid projects={projects} />;
  return (
    <>
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} isOwnerView={showOwnerView} manageContent={showOwnerView} />
      ))}
    </>
  );
}

// Tier 1's rendered height — the always-sticky toolbar row (see the
// wrapper below). Tier 2 (the Posts/Projects tab bar) docks its own
// `top` offset directly under this, via the matching `top-14`
// Tailwind class, so the two numbers can't silently drift apart.
// h-14 === 56px === top-14.
const TOOLBAR_HEIGHT_CLASS = "h-14";
const TOOLBAR_HEIGHT_PX = 56;

// Shared button looks for the icon-led toolbar and action row.
const TOOLBAR_ICON_BTN =
  "w-10 h-10 shrink-0 flex items-center justify-center rounded-full text-ink hover:bg-ink/5 active:bg-ink/10 transition-colors";
const ACTION_ICON_BTN_FLEX =
  "flex-1 h-11 inline-flex items-center justify-center rounded-xl bg-surface border border-border text-ink active:scale-[0.97] transition-transform";

// Icon-led empty / blocked / error state — same shape as the private-account
// notice so every "nothing to show" moment on the profile reads the same.
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

export function ProfilePage() {
  // The page scrollbar popped in and out as the tab changed the page height (Posts vs Files); keep it out of the way.
  useHidePageScrollbar();
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const restricted = useIsRestricted();
  const canFollow = useCanFollow();
  const startConversation = useStartConversation();
  const toast = useToast();
  // Separate menu from the visitor-side "Send to" sheet below — the
  // owner's dropdown (Share profile / View as visitor / Follow
  // requests / Wallet / Settings) needs its own open state and its
  // own anchor button.
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const ownerMenuButtonRef = useRef<HTMLButtonElement>(null);
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  // Whether there's anything to actually switch between — if this is
  // the only account on the device, tapping the name should skip
  // straight to adding one instead of opening a dropdown with just
  // "You" and an "Add account" row in it.
  // Always opens the same AccountSwitcher dropdown now, regardless of
  // whether there's anyone else saved yet — it already renders "You"
  // plus an "Add account" row unconditionally (see AccountSwitcher.tsx),
  // so there was never a real need to skip past it. Jumping straight
  // to the full /login?add=1 page when this is the only account on the
  // device read as an unexplained forced logout; a small, familiar
  // dropdown with an explicit "Add account" row makes what's about to
  // happen obvious before it happens.
  function handleAccountNameClick() {
    setAccountSwitcherOpen((o) => !o);
  }
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  useBackDismiss(() => setShowUnfollowConfirm(false), showUnfollowConfirm);
  useScrollLock(showUnfollowConfirm);

  // Removing a follower is a one-way relationship change the other
  // person feels (they stop following you, silently) — always worth a
  // pause, unlike Mute/Message which are reversible or inert. See
  // ConfirmDialog.tsx's own doc comment for the "when does this get a
  // confirm" rule this follows.
  const [showRemoveFollowerConfirm, setShowRemoveFollowerConfirm] = useState(false);
  useBackDismiss(() => setShowRemoveFollowerConfirm(false), showRemoveFollowerConfirm);
  useScrollLock(showRemoveFollowerConfirm);

  // Blocking cuts the relationship in both directions at once (they
  // stop following you, you stop following them, messaging closes) —
  // always worth a pause. Unblocking gets no confirm: it's the
  // reversible, non-punitive direction, same reasoning as Mute. See
  // ConfirmDialog.tsx's own doc comment for the "when does this get a
  // confirm" rule this follows.
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  useBackDismiss(() => setShowBlockConfirm(false), showBlockConfirm);
  useScrollLock(showBlockConfirm);

  // The visitor-side "you're following them" control — Message,
  // Unfollow, Mute, and (when applicable) Remove follower live behind
  // this one anchored menu instead of "Unfollow" sitting exposed as
  // its own one-tap pill (see the toolbar below). Separate from
  // ownerMenuOpen/shareSheetOpen: this is its own anchor button.
  const [relationshipMenuOpen, setRelationshipMenuOpen] = useState(false);
  const relationshipMenuButtonRef = useRef<HTMLButtonElement>(null);

  const [previewingAsVisitor, setPreviewingAsVisitor] = useState(false);
  // Owner quick actions (share / view as visitor / activity) stay tucked away until the chevron under the
  // Pages icon is tapped.
  const [actionsOpen, setActionsOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  // Visitor's consolidated "…" sheet (see ShareProfileSheet — Report/
  // Block/Customise name/QR now; relationship actions moved out to the
  // menu above) and the owner's full-screen QR share takeover (see
  // ProfileShareScreen) — mutually exclusive, but kept as separate
  // flags since they're reached from different toolbar states and
  // never both apply.
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [reportContentOpen, setReportContentOpen] = useState(false);
  const [qrShareOpen, setQrShareOpen] = useState(false);

  // "Back to post" FAB — set once, from the router state a Feed post's
  // byline attaches when it sends a visitor here (see the identityHref
  // Links in PostCard.tsx). Read via a lazy initializer so it survives
  // exactly one mount, then the history entry's own state is cleared
  // the same way Feed does for its justPostedId — paging back/forward
  // through history afterward shouldn't keep re-arming this on a page
  // that's no longer "freshly arrived from that post".
  const [fromFeedPost] = useState<{ id: string } | null>(
    () => (location.state as { fromFeedPost?: { id: string } } | null)?.fromFeedPost ?? null
  );
  useEffect(() => {
    if (fromFeedPost) window.history.replaceState({}, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  usePrimaryFloatingAction(!!fromFeedPost);

  function handleBackToFeedPost() {
    if (!fromFeedPost) return;
    navigate("/feed", { state: { scrollToPostId: fromFeedPost.id } });
  }

  // Tier 1 (the toolbar row — Plus/⋯, or Message/Follow/⋯ for a
  // visitor) fades and collapses away once the non-sticky header block
  // above it (avatar/name/bio/Following-Followers) has scrolled fully
  // out from under it — not on scroll direction like BottomNav/
  // AutoHideTopBar elsewhere, since the point here is reclaiming the
  // space that block leaves behind for content, not hiding chrome
  // during a quick scroll. Tier 2 (the tab bar + its sliding indicator)
  // then docks at the very top instead of 56px below it — see its
  // `top` class further down — so once collapsed, only the tab titles
  // and the indicator line remain pinned. headerBlockRef marks that
  // block; re-measuring on every scroll (rather than once) keeps this
  // correct if the block's height ever changes (e.g. a bio wrapping to
  // a different number of lines after the profile query resolves).
  const headerBlockRef = useRef<HTMLDivElement>(null);
  const [tier1Collapsed, setTier1Collapsed] = useState(false);
  useEffect(() => {
    function onScroll() {
      const rect = headerBlockRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTier1Collapsed(rect.bottom <= TOOLBAR_HEIGHT_PX);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: profile, isLoading } = useProfileByUsername(username!);
  const [tabDragging, setTabDragging] = useState(false);

  const isFollowingQuery = useIsFollowingAsActiveIdentity(profile?.id ?? "");
  const isFollowedByUserQuery = useIsFollowedByUser(profile?.id ?? "");
  const toggleFollow = useToggleFollowAsActiveIdentity(profile?.id ?? "");
  const hasPendingRequestQuery = useHasPendingFollowRequest(profile?.id ?? "");
  const sendFollowRequest = useSendFollowRequest(profile?.id ?? "");
  const cancelFollowRequest = useCancelFollowRequest(profile?.id ?? "");
  const incomingRequestCount = useIncomingFollowRequestCount();
  const isBlockedQuery = useIsBlocked(profile?.id ?? "");
  const toggleBlock = useToggleBlock(profile?.id ?? "");
  const isMutedQuery = useIsMuted(profile?.id ?? "");
  const toggleMute = useToggleMute(profile?.id ?? "");
  const removeFollower = useRemoveFollower(profile?.id ?? "");
  // Private, viewer-only override for how this profile's name reads to
  // ME (see "Customise name" in ShareProfileSheet) — never touches the
  // profile itself, so it only ever changes what I see.
  const { data: nickname } = useContactNickname(profile?.id ?? "");

  const isOwnProfile = user?.id === profile?.id;
  const profilePagesQuery = useProfilePages(profile?.id ?? "");
  const [pagesOpen, setPagesOpen] = useState(false);
  const showOwnerView = isOwnProfile && !previewingAsVisitor;
  // Up to 3 websites; website_url mirrors the first for rows written before website_urls existed.
  const websites = profile?.website_urls?.length ? profile.website_urls : profile?.website_url ? [profile.website_url] : [];
  // Projects on this profile are the PERSON's. While acting as a Page, the
  // Page is a different account, so they read as another user's content: no
  // owner controls and no drafts/archived — same as any visitor.
  const { actingAsPageId, loading: identityLoading } = useProjectOwnership();
  const projectsOwnerView = showOwnerView && !identityLoading && !actingAsPageId;

  const isFollowing = !!isFollowingQuery.data;
  const isFollowedByUser = !!isFollowedByUserQuery.data;
  const hasPendingRequest = !!hasPendingRequestQuery.data;
  // Quiet cross-fade on the follow control and a small tick on the counters when they change (index.css).
  const followPulse = useChangePulse(isFollowing ? "following" : hasPendingRequest ? "requested" : "follow");
  const followersPulse = useChangePulse(profile?.follower_count);
  const followingPulse = useChangePulse(profile?.following_count);
  const isBlocked = !!isBlockedQuery.data;
  const isMuted = !!isMutedQuery.data;
  // A nickname only ever overrides what I, personally, see — it never
  // changes profile.display_name itself, so anything that needs the
  // real name (unfollow confirm copy, share text, etc.) keeps reading
  // profile.display_name directly and only the on-screen labels below
  // swap to displayName.
  const displayName = nickname || profile?.display_name || "";
  const firstName = profile?.display_name?.trim().split(/\s+/)[0] ?? "";

  // A private account's posts and projects must never reach a visitor
  // who isn't an approved follower — not "hidden behind a tab", not
  // "shown then blocked", genuinely never fetched. While the follow
  // status is still loading, this defaults to locked (rather than
  // briefly showing content and yanking it back a moment later), which
  // is the safer direction to be wrong in for a privacy gate.
  const isPrivateLocked = !!profile?.is_private && !showOwnerView && !isFollowing;
  // Pages icon: orange + tappable only when there is something to show; hidden behind a private lock.
  const hasPages = !isPrivateLocked && (profilePagesQuery.data?.length ?? 0) > 0;
  // The owner can always open the modal: with pages it lists them (tap to switch into one), without
  // any it explains pages and offers to set one up. A visitor only gets it when there's something to see.
  const pagesIconEnabled = showOwnerView || hasPages;

  // Passing "" makes each hook's own `enabled: !!userId` guard skip the
  // request entirely — a locked-out visitor's client never asks the
  // server for this profile's posts/projects in the first place.
  const { data: projects, isLoading: projectsLoading } = useUserProjects(isPrivateLocked ? "" : profile?.id ?? "", projectsOwnerView);
  // Restricted (consumer-only) accounts see projects only — never posts. Everyone else
  // gets the Posts tab; an empty id keeps the query from firing at all.
  const { data: posts, isLoading: postsLoading, isError: postsError } = useUserPostsWithArchived(isPrivateLocked || restricted ? "" : profile?.id ?? "", false);
  const { data: portfolioCategories, isLoading: portfolioLoading } = usePortfolioCategories(isPrivateLocked ? undefined : profile?.id);
  const { data: categorizedProjectIds } = useCategorizedProjectIds(isPrivateLocked ? undefined : profile?.id);
  const { data: typeCategories, isLoading: typeCategoriesLoading } = useTypePortfolioCategories(isPrivateLocked ? undefined : profile?.id);
  // True until the queries that decide which tabs exist (and what the Projects tab holds) have answered —
  // an empty-state message before then would claim "nothing here" about data that simply hasn't arrived.
  const tabsLoading = projectsLoading || portfolioLoading || typeCategoriesLoading;
  const { data: collaboratorMedia } = useCollaboratorMediaProjects(isPrivateLocked ? undefined : profile?.id);

  // Archived projects have their own home on the merged Archive page
  // now (see Archive.tsx) — this tab only ever shows active/draft/
  // cancelled ones.
  const visibleProjects = projects?.filter((p) => p.status !== "archived");

  // Media gets its own dynamic tab (spec §6, updated): a Media project
  // shows on BOTH the owner's profile and every accepted collaborator's
  // profile, not just the owner's — the same way a gift on it splits
  // across all of them (process_media_gift). Owner's copies come from
  // the ordinary projects query already fetched above; collaborator
  // credits need their own RPC (see useCollaboratorMediaProjects — RLS
  // on project_collaborators blocks a plain client join here). Merge
  // and dedupe by id since — in principle — someone could show up in
  // both lists across an ownership transfer or similar edge case.
  // Once a Media project is published to the Akọ music catalogue and
  // attached as a gig sample (e.g. under "Artist"), it moves there —
  // it should no longer also show in Media, or it appears twice on
  // the same profile (categorizedProjectIds already exists for this
  // exact purpose; the Media tab just wasn't checking it before).
  const ownedMedia = (visibleProjects ?? []).filter(
    (p) => p.project_type === "media" && !p.is_private && !categorizedProjectIds?.has(p.id)
  );
  const mediaProjects = (() => {
    const byId = new Map(ownedMedia.map((p) => [p.id, p]));
    for (const p of collaboratorMedia ?? []) {
      if (!categorizedProjectIds?.has(p.id)) byId.set(p.id, p);
    }
    return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  })();

  // Types that now get their own dynamic tab via typeCategories (spec
  // section 2/44's other half — Book/Course/Event/Room/File). Only
  // drop one of these from the fallback once it's actually
  // active+public, same eligibility get_profile_type_categories uses
  // server-side — a draft/private one has no tab home yet, so it
  // stays visible to its owner here instead of disappearing.
  const TYPE_CATEGORY_TYPES = new Set<ProjectType>(["book", "course", "event", "room", "file"]);
  const typeCategoriesPresent = new Set((typeCategories ?? []).map((c) => c.project_type));

  // Non-gig, non-type-categorized work with no category home yet — a
  // deliberate fallback (spec section 44), never shown when empty.
  // Also excludes anything already surfaced under a dynamic
  // role-based category tab (e.g. a published song showing under
  // "Artist"), so the fallback doesn't become a dumping ground /
  // duplicate of a category tab.
  const fallbackProjects = visibleProjects?.filter((p) => {
    if (p.project_type === "gig") return false;
    // Only drop it here once it actually has the Media tab as a home
    // (active + public, same as ownedMedia above) — a draft or
    // private Media project has no tab yet, so it stays visible to
    // its owner in the fallback instead of disappearing, same
    // reasoning as the TYPE_CATEGORY_TYPES check below.
    if (p.project_type === "media" && p.status === "active" && !p.is_private) return false;
    if (categorizedProjectIds?.has(p.id)) return false;
    if (
      TYPE_CATEGORY_TYPES.has(p.project_type) &&
      typeCategoriesPresent.has(p.project_type) &&
      p.status === "active" &&
      !p.is_private
    ) {
      return false;
    }
    return true;
  });

  // Posts first (full-access accounts only), then dynamic categories from the account's
  // active Gigs (spec sections 2-5), then the type-based categories
  // (Books/Courses/Events/Rooms/Files) — never an empty one either
  // way. The uncategorized-work fallback comes last, only if there's
  // anything left in it.
  const tabDefs: { id: string; label: string }[] = [
    ...(restricted ? [] : [{ id: "posts", label: "Posts" }]),
    ...(portfolioCategories ?? []).map((c) => ({ id: categoryToTabId(c.category), label: c.category })),
    ...(typeCategories ?? []).map((c) => ({ id: `type-${c.project_type}`, label: c.category })),
    ...(mediaProjects.length > 0 ? [{ id: "media", label: "Media" }] : []),
    ...(fallbackProjects && fallbackProjects.length > 0 ? [{ id: "projects", label: "Projects" }] : []),
  ];
  const TAB_IDS = tabDefs.map((t) => t.id);

  // Lets a shared project link (?tab=projects) land directly on a
  // tab, and now also survives a refresh either way — see
  // useTabState.
  // Default is whichever tab comes first; a stale ?tab=posts link just
  // falls back to it.
  const [activeTab, setActiveTab] = useTabState<ProfileTab>(TAB_IDS, TAB_IDS[0] ?? "projects");
  // Continuous tab position fed by SwipeableTabs' onProgress, same idea as
  // Feed's tab row — lets the sliding indicator bar track the finger
  // during a drag instead of only jumping once the swipe commits.
  const [tabProgress, setTabProgress] = useState(TAB_IDS.indexOf(activeTab));
  // TAB_IDS can grow after mount (portfolio categories load async, or a
  // deep link lands on a category tab before that query resolves) —
  // resync the indicator once the real index is known rather than
  // leaving it stuck at its initial (possibly -1) value.
  useEffect(() => {
    setTabProgress(Math.max(TAB_IDS.indexOf(activeTab), 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, tabDefs.length]);

  // Recording a visit is safe to fire on every mount (it no-ops for
  // self-visits inside the hook). The 30-day visit COUNT itself no
  // longer lives on this page at all — it moved to Settings → Profile
  // (see Settings.tsx), since it's an owner-facing stat about the
  // account, not something a visitor scrolling this profile needs to
  // see mixed in with Following/Followers.
  useRecordProfileVisit(profile?.id);

  // Outside-click / back-dismiss for both "…" menus (visitor-side
  // mute/block, owner-side options) is handled internally by
  // <DropdownMenu> now.

  // The actual unfollow — reachable from the relationship menu's
  // "Unfollow" item now, not from a bare one-tap pill. Still gets a
  // confirm whenever there's something worth knowing first: a mutual
  // follow (easy to drop by accident) or a private account
  // (re-following means asking again, not an instant follow) — either
  // reason is enough to pause, and the dialog below shows whichever
  // applies. Opening the menu is already a deliberate first step, so
  // a plain unfollow (neither condition) goes straight through.
  function startUnfollow() {
    if (isFollowedByUser || profile?.is_private) {
      setShowUnfollowConfirm(true);
      return;
    }
    toggleFollow.mutate(true);
  }

  function handleFollowClick() {
    // isFollowing has no pill of its own anymore — see the toolbar
    // below — so this only ever runs for the three states that are
    // still a single, non-destructive tap: Requested (cancel), a
    // private account (send request), or a plain Follow.
    if (hasPendingRequest) {
      cancelFollowRequest.mutate();
      return;
    }

    if (profile?.is_private) {
      sendFollowRequest.mutate();
      return;
    }

    toggleFollow.mutate(false);
  }

  function confirmUnfollow() {
    toggleFollow.mutate(true);
    setShowUnfollowConfirm(false);
  }

  async function handleMessage() {
    if (!profile) return;
    const conversationId = await startConversation.mutateAsync(profile.id);
    navigate(`/messages/${conversationId}`);
  }

  // Opens the confirm — the actual removal is confirmRemoveFollower
  // below. Closes whichever menu it was opened from first.
  function handleRemoveFollower() {
    setRelationshipMenuOpen(false);
    setShareSheetOpen(false);
    setShowRemoveFollowerConfirm(true);
  }

  function confirmRemoveFollower() {
    removeFollower.mutate(undefined, {
      onSuccess: () => {
        setShowRemoveFollowerConfirm(false);
        toast(`Removed ${firstName || "this follower"}.`, { variant: "success" });
      },
    });
  }

  // Unblocking fires immediately (reversible, no confirm needed).
  // Blocking opens the confirm instead — the actual mutation is
  // confirmBlock below. Closes the sheet it was opened from first,
  // same as handleRemoveFollower.
  function handleToggleBlock() {
    if (isBlocked) {
      toggleBlock.mutate(true);
      return;
    }
    setShareSheetOpen(false);
    setShowBlockConfirm(true);
  }

  function confirmBlock() {
    toggleBlock.mutate(false, {
      onSuccess: () => {
        setShowBlockConfirm(false);
        toast(`Blocked ${firstName || "this account"}.`, { variant: "success" });
      },
    });
  }

  // Same swipe pattern as Feed's tab row — SwipeableTabs is bound only to
  // the content area below the tab bar (see the wrapping div further
  // down), so swiping over the header/bio never accidentally flips tabs.
  const activeIndex = Math.max(TAB_IDS.indexOf(activeTab), 0);

  function handleTabClick(index: number, tab: ProfileTab) {
    if (index === activeIndex) return;
    setActiveTab(tab);
  }

  if (isLoading) return <ProfilePageSkeleton />;
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas pb-24">
        <p className="text-ink-muted">Profile not found.</p>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Tier 1 — the icon toolbar. Owner: edit (pencil) on the left, the
          reserved ad slot in the middle, create (+) and the menu on the
          right. Visitor: share and more. While the owner previews as a
          visitor it's just the exit control. Sticky and fixed-height so
          Tier 2 below has a stable offset to dock under, then fades away
          once the header block has scrolled past (see tier1Collapsed). */}
      <div
        className={`sticky top-0 z-chrome bg-canvas overflow-hidden transition-[opacity,max-height] duration-200 ease-out ${
          tier1Collapsed ? "opacity-0 max-h-0 pointer-events-none" : "opacity-100 max-h-14"
        }`}
      >
        <div className={`max-w-xl md:max-w-2xl mx-auto px-3 ${TOOLBAR_HEIGHT_CLASS} flex items-center gap-1`}>
          {showOwnerView ? (
            <>
              <Link to="/settings/profile" aria-label="Edit profile" title="Edit profile" className={TOOLBAR_ICON_BTN}>
                <Pencil size={22} />
              </Link>
              <ProfileAdSlot className="flex-1 min-w-0 mx-1" />
              {!restricted && (
                <Link to="/create" state={{ background: location }} aria-label="Create" title="Create" className={TOOLBAR_ICON_BTN}>
                  <Plus size={26} />
                </Link>
              )}

              <div className="relative">
                <button
                  ref={ownerMenuButtonRef}
                  onClick={() => setOwnerMenuOpen((o) => !o)}
                  className={`relative ${TOOLBAR_ICON_BTN}`}
                  aria-label="Profile options"
                  title="Menu"
                >
                  <Menu size={24} />
                  {/* Same badge shown again on the "Follow requests" row
                      below — this one flags that something inside the
                      menu needs attention before it's even opened. */}
                  {incomingRequestCount > 0 && (
                    <span className="absolute top-1 right-1 bg-danger text-canvas text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
                      {incomingRequestCount > 9 ? "9+" : incomingRequestCount}
                    </span>
                  )}
                </button>

                {ownerMenuOpen && (
                  <DropdownMenu
                    title="Menu"
                    anchorRef={ownerMenuButtonRef}
                    onClose={() => setOwnerMenuOpen(false)}
                    items={[
                      {
                        key: "activity",
                        label: "Activity",
                        icon: <ActivityIcon />,
                        onSelect: () => {
                          setOwnerMenuOpen(false);
                          navigate("/activity");
                        },
                      },
                      ...(profile.is_private
                        ? ([
                            {
                              key: "follow-requests",
                              label: "Follow requests",
                              icon: <UserCheck />,
                              badge:
                                incomingRequestCount > 0 ? (
                                  <span className="bg-danger text-canvas text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                                    {incomingRequestCount > 9 ? "9+" : incomingRequestCount}
                                  </span>
                                ) : undefined,
                              onSelect: () => navigate("/requests"),
                            },
                          ] satisfies DropdownMenuItem[])
                        : []),
                      ...(restricted
                        ? []
                        : ([
                          {
                            key: "gigs",
                            label: "Your Gigs",
                            icon: <Briefcase />,
                            onSelect: () => navigate("/gigs"),
                          },
                          {
                            key: "page",
                            label: "Page",
                            icon: <Building2 />,
                            onSelect: () => {
                              setOwnerMenuOpen(false);
                              setPagesOpen(true);
                            },
                          },
                          ] satisfies DropdownMenuItem[])),
                      { key: "wallet", label: "Wallet", icon: <Wallet />, onSelect: () => navigate("/wallet") },
                    ]}
                  />
                )}
              </div>
            </>
          ) : isOwnProfile ? (
            <div className="flex items-center justify-end w-full">
              <button
                onClick={() => setPreviewingAsVisitor(false)}
                className="flex items-center gap-1.5 text-sm text-accent font-medium px-3 py-2 rounded-full bg-accent-soft"
              >
                <X size={14} />
                Exit preview
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1" />
              <button
                onClick={() => setQrShareOpen(true)}
                className={TOOLBAR_ICON_BTN}
                aria-label="Share profile"
                title="Share profile"
              >
                <Share2 size={22} />
              </button>
              <button
                onClick={() => setShareSheetOpen(true)}
                className={TOOLBAR_ICON_BTN}
                aria-label="More options"
                title="More options"
              >
                <MoreHorizontal size={22} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Non-sticky header content — name, handle, roles and stats on the
          left; a large avatar on the right; then bio, website and the
          action row. This scrolls away underneath Tier 1; only the
          toolbar row and the tab bar (Tier 2, further down) stay pinned. */}
      <div ref={headerBlockRef} className="max-w-xl md:max-w-2xl mx-auto px-4 pt-2">
        {/* Preview-mode banner — informational only; the actual "Exit"
            control lives in the always-reachable Tier 1 bar above. */}
        {isOwnProfile && previewingAsVisitor && (
          <div className="flex items-center gap-1.5 bg-accent-soft text-accent text-sm rounded-xl px-4 py-2.5 mb-4">
            <Eye size={14} />
            Viewing your profile as a visitor sees it
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              {showOwnerView ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleAccountNameClick}
                    className="flex items-center gap-1 text-left"
                    aria-label="Switch account"
                  >
                    <h1 className="font-bold text-[1.75rem] leading-tight tracking-tight text-ink break-words">
                      {profile.display_name}
                    </h1>
                    <ChevronDown size={18} className="text-ink-muted shrink-0 mt-1" />
                  </button>
                  {accountSwitcherOpen && (
                    <AccountSwitcher onClose={() => setAccountSwitcherOpen(false)} />
                  )}
                </div>
              ) : (
                <h1 className="font-bold text-[1.75rem] leading-tight tracking-tight text-ink break-words">
                  {displayName}
                </h1>
              )}
              <TierBadge tier={profile.tier} />
            </div>

            <p className="text-base text-ink-muted mt-0.5 truncate">@{profile.username}</p>

            {profile.badge_visible && (
              <VerifiedBadge size={15} label className="mt-1" />
            )}
            {showOwnerView && profile.badge_streak != null && (
              <BadgeStreakNote visible={!!profile.badge_visible} streak={profile.badge_streak} />
            )}

            {profile.roles.length > 0 && (
              <RoleTags roles={profile.roles} className="text-xs text-ink-muted block mt-1" />
            )}

            {/* Visit count ("X visits in the last 30 days") lives in
                Settings → Profile — it's an owner-facing stat about the
                account, not part of this row (see Settings.tsx). */}
          </div>

          <div className="relative shrink-0">
            {profile.avatar_url ? (
              <button
                type="button"
                onClick={() => setAvatarOpen(true)}
                className="block rounded-full ring-2 ring-border ring-offset-2 ring-offset-canvas"
                aria-label="View profile photo"
              >
                <Avatar src={profile.avatar_url} name={profile.display_name} size="2xl" />
              </button>
            ) : (
              <span className="block rounded-full ring-2 ring-border ring-offset-2 ring-offset-canvas">
                <Avatar src={profile.avatar_url} name={profile.display_name} size="2xl" />
              </span>
            )}
            {showOwnerView && (
              <Link
                to="/settings/profile"
                aria-label="Change profile photo"
                title="Change profile photo"
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-cta text-white border-[3px] border-canvas flex items-center justify-center shadow-sm active:scale-95 transition-transform"
              >
                <Plus size={18} strokeWidth={2.75} />
              </Link>
            )}
          </div>
        </div>

        {/* Stats row — Following / Followers on the left, Pages on the right (under the avatar). */}
        <div className="flex items-center justify-between gap-4 mt-5">
          <div className="flex items-center gap-7">
            <Link to={`/profile/${profile.username}/following`} className="block">
              <span className="block text-xl font-semibold leading-none text-ink tabular-nums">
                <span className={followingPulse ? "ako-count-tick" : ""}>{profile.following_count}</span>
              </span>
              <span className="block text-sm text-ink-muted mt-1.5">Following</span>
            </Link>
            <Link to={`/profile/${profile.username}/followers`} className="block">
              <span className="block text-xl font-semibold leading-none text-ink tabular-nums">
                <span className={followersPulse ? "ako-count-tick" : ""}>{profile.follower_count}</span>
              </span>
              <span className="block text-sm text-ink-muted mt-1.5">Followers</span>
            </Link>
          </div>
          <button
            type="button"
            disabled={!pagesIconEnabled}
            onClick={() => setPagesOpen(true)}
            aria-label={pagesIconEnabled ? "View pages" : "Not affiliated with any pages"}
            title={pagesIconEnabled ? "Pages" : "Not affiliated with any pages"}
            className={`shrink-0 w-11 h-11 mr-1 rounded-full flex items-center justify-center transition-transform ${
              pagesIconEnabled ? "text-brand-orange active:scale-95" : "text-ink-muted opacity-40 cursor-default"
            }`}
          >
            <Building2 size={26} strokeWidth={2} />
          </button>
        </div>

        {profile.bio && (
          <p className="text-[15px] leading-relaxed text-ink mt-5 whitespace-pre-line break-words">{profile.bio}</p>
        )}

        {showOwnerView ? (
          <>
            {/* Websites on the left, the chevron on the right: same horizontal axis as the first website, centred
                under the Pages icon. */}
            <div className="flex items-start justify-between gap-3 mt-3">
              <div className="flex flex-wrap gap-2 min-w-0">
            {websites.map((url) => (
              <a
                key={url}
                href={getWebsiteHref(url)}
                target="_blank"
                rel="noopener noreferrer"
                title={url}
                className="inline-flex items-center gap-1.5 max-w-full rounded-full bg-accent-soft text-accent text-sm font-medium px-3 py-1.5"
              >
                <Link2 size={14} className="shrink-0" />
                <span className="truncate">{getWebsiteDomain(url)}</span>
              </a>
            ))}
              </div>
              <button
                type="button"
                onClick={() => setActionsOpen((o) => !o)}
                aria-expanded={actionsOpen}
                aria-controls="owner-quick-actions"
                aria-label={actionsOpen ? "Hide quick actions" : "Show quick actions"}
                title={actionsOpen ? "Hide quick actions" : "Show quick actions"}
                className="shrink-0 ml-auto mr-1 w-11 h-8 flex items-center justify-center text-ink-muted active:scale-95 transition-transform"
              >
                <ChevronDown size={18} className={`transition-transform duration-300 ease-out motion-reduce:transition-none ${actionsOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Push down / push up: the row's height animates open (grid 0fr -> 1fr) so everything below slides with
                it, while the icons ease in from just above their final spot. Hidden from focus and AT when closed. */}
            <div
              id="owner-quick-actions"
              inert={!actionsOpen}
              aria-hidden={!actionsOpen}
              className={`grid mb-4 transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                actionsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className={`flex items-center gap-2 pt-4 transition-transform duration-300 ease-out motion-reduce:transition-none ${
                    actionsOpen ? "translate-y-0" : "-translate-y-3"
                  }`}
                >
                  <button type="button" onClick={() => setQrShareOpen(true)} className={ACTION_ICON_BTN_FLEX} aria-label="Share profile" title="Share profile">
                    <Share2 size={20} />
                  </button>
                  <button type="button" onClick={() => setPreviewingAsVisitor(true)} className={ACTION_ICON_BTN_FLEX} aria-label="View as visitor" title="View as visitor">
                    <Eye size={20} />
                  </button>
                  <Link to="/activity" className={ACTION_ICON_BTN_FLEX} aria-label="Activity" title="Activity">
                    <ActivityIcon size={20} />
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
        {websites.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {websites.map((url) => (
              <a
                key={url}
                href={getWebsiteHref(url)}
                target="_blank"
                rel="noopener noreferrer"
                title={url}
                className="inline-flex items-center gap-1.5 max-w-full rounded-full bg-accent-soft text-accent text-sm font-medium px-3 py-1.5"
              >
                <Link2 size={14} className="shrink-0" />
                <span className="truncate">{getWebsiteDomain(url)}</span>
              </a>
            ))}
          </div>
        )}


        {/* Action row — icon-led. The owner gets quick actions; a visitor
            gets the one follow control that matches the relationship
            (follow / follow back / requested / following) plus message. */}
        <div className="flex items-center gap-2 mt-5 mb-4">
          {isOwnProfile ? null : (
            <>
              {isFollowing ? (
                <button
                  ref={relationshipMenuButtonRef}
                  onClick={() => setRelationshipMenuOpen((o) => !o)}
                  disabled={isBlocked}
                  aria-label="Following — open options"
                  className={`flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-soft text-accent text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-40 ${followPulse ? "ako-follow-swap" : ""}`}
                >
                  <UserCheck size={19} />
                  Following
                  <ChevronDown size={16} />
                </button>
              ) : canFollow || hasPendingRequest ? (
                // Not disabled while a write is in flight: the tap already updated the screen and taps are queued
                // in order (lib/followCache.ts), so a second tap is safe instead of silently ignored.
                <button
                  onClick={handleFollowClick}
                  disabled={isBlocked}
                  className={`flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-40 ${
                    hasPendingRequest
                      ? "bg-accent-soft text-accent"
                      : isFollowedByUser
                      ? "bg-pushback/15 text-pushback"
                      : "bg-cta text-white"
                  } ${followPulse ? "ako-follow-swap" : ""}`}
                >
                  {hasPendingRequest ? <Clock size={19} /> : <UserPlus size={19} />}
                  {hasPendingRequest ? "Requested" : isFollowedByUser ? "Follow back" : "Follow"}
                </button>
              ) : null}

              {relationshipMenuOpen && isFollowing && (
                <DropdownMenu
                  title="Following"
                  anchorRef={relationshipMenuButtonRef}
                  onClose={() => setRelationshipMenuOpen(false)}
                  items={[
                    {
                      key: "mute",
                      label: isMuted ? "Unmute" : "Mute their updates",
                      icon: isMuted ? <Bell /> : <BellOff />,
                      onSelect: () => toggleMute.mutate(isMuted),
                    },
                    "divider",
                    {
                      key: "unfollow",
                      label: "Unfollow",
                      icon: <UserMinus />,
                      variant: "danger",
                      onSelect: startUnfollow,
                    },
                  ]}
                />
              )}

              <button
                onClick={handleMessage}
                disabled={startConversation.isPending || isBlocked}
                className="h-11 w-12 shrink-0 inline-flex items-center justify-center rounded-xl bg-surface border border-border text-ink active:scale-[0.96] transition-transform disabled:opacity-40"
                aria-label="Message"
                title="Message"
              >
                <MessageCircle size={20} />
              </button>
            </>
          )}
        </div>
          </>
        )}
      </div>

      {/* Tier 2 — the icon tab bar. Its own sticky element, docking under
          Tier 1 (top-14 === Tier 1's h-14) normally and at the very top
          once Tier 1 has collapsed away, so only the tab icons and the
          sliding indicator stay pinned once the header has scrolled past.
          Tabs carry no text: each icon comes from profileTabIcon(), and
          the label stays available as aria-label / tooltip. Hidden
          entirely for a locked private profile. */}
      {!isPrivateLocked && tabDefs.length > 0 && (
        <div
          className={`sticky z-subchrome bg-canvas transition-[top] duration-200 ease-out ${
            tier1Collapsed ? "top-0" : "top-14"
          }`}
        >
          <div className="max-w-xl md:max-w-2xl mx-auto px-4">
            <div role="tablist" className="relative flex items-stretch border-b border-border">
              {tabDefs.map((tab, i) => {
                const TabIcon = profileTabIcon(tab.id, tab.label);
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-label={tab.label}
                    title={tab.label}
                    onClick={() => handleTabClick(i, tab.id)}
                    className={`flex-1 h-12 flex items-center justify-center transition-colors ${
                      isActive ? "text-accent" : "text-ink-muted"
                    }`}
                  >
                    <TabIcon size={24} strokeWidth={isActive ? 2.25 : 1.75} />
                  </button>
                );
              })}
              <div
                className={`ako-tab-indicator absolute bottom-0 left-0 h-[3px] flex justify-center ${
                  tabDragging ? "ako-tab-indicator--dragging" : ""
                }`}
                style={{
                  width: `${100 / tabDefs.length}%`,
                  transform: `translateX(${tabProgress * 100}%)`,
                }}
              >
                <span className="block w-9 h-full rounded-full bg-accent" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-xl md:max-w-2xl mx-auto px-4">
        {/* Tab content — real drag-tracking carousel, same as Feed's tab
            row (see SwipeableTabs.tsx). A locked/blocked profile has
            nothing behind either tab, so it skips the carousel and just
            shows the one relevant message instead of two identical panes. */}
        <div className="mt-4">
          {isBlocked ? (
            <EmptyNote icon={Ban}>You've blocked this account. Unblock to see their content.</EmptyNote>
          ) : isPrivateLocked ? (
            <div className="flex flex-col items-center text-center py-14 px-6">
              <div className="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center mb-3">
                <Lock size={22} className="text-accent" />
              </div>
              <p className="text-ink font-medium">This account is private</p>
              <p className="text-ink-muted text-sm mt-1 max-w-xs">
                Follow {firstName || "this account"} to see their {restricted ? "projects" : "posts and projects"}.
              </p>
            </div>
          ) : tabDefs.length === 0 && tabsLoading ? (
            <ProjectMiniGridSkeleton />
          ) : tabDefs.length === 0 ? (
            <EmptyNote icon={Layers}>
              {projectsOwnerView ? "No projects yet — publish your first one." : "No projects yet."}
            </EmptyNote>
          ) : (
            <SwipeableTabs
              restoreScroll={false}
              index={activeIndex}
              onIndexChange={(i) => setActiveTab(TAB_IDS[i])}
              onProgress={(progress, dragging) => {
                setTabProgress(progress);
                setTabDragging(dragging);
              }}
            >
              {tabDefs.map((tab) => {
                if (tab.id === "posts") {
                  return (
                    <div key="posts">
                      {postsLoading ? (
                        <PostListSkeleton />
                      ) : posts && posts.length > 0 ? (
                        posts.map((post: any) => (
                          <PostCard key={post.id} post={post} isOwnerView={showOwnerView} />
                        ))
                      ) : postsError ? (
                        <EmptyNote icon={RefreshCw}>Couldn't load posts. Pull down or reopen the page to retry.</EmptyNote>
                      ) : (
                        <EmptyNote icon={LayoutGrid}>No posts yet.</EmptyNote>
                      )}
                    </div>
                  );
                }
                if (tab.id === "media") {
                  return (
                    <div key="media">
                      {mediaProjects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          // Only ever the true owner's own edit/manage
                          // affordances — a collaborator's credit on
                          // someone else's Media isn't "their" project
                          // to manage, just to appear on. showOwnerView
                          // already resolves per-card against
                          // project.owner_id when left undefined here.
                          isOwnerView={projectsOwnerView && project.owner_id === profile.id}
                        />
                      ))}
                    </div>
                  );
                }
                if (tab.id === "projects") {
                  return (
                    <div key="projects">
                      {fallbackProjects && fallbackProjects.length > 0 ? (
                        // Compact glance-and-tap grid, not the full
                        // buy/download/menu ProjectCard — this tab is
                        // a catch-all that can hold a lot of mixed
                        // project types, so it reads better as cards
                        // to scan than a long scrolling list. Each
                        // card opens the project's own canonical page
                        // (slug-aware) on tap, same as everywhere else.
                        <ProjectMiniGrid projects={fallbackProjects} />
                      ) : projectsLoading ? (
                        <ProjectMiniGridSkeleton />
                      ) : (
                        <EmptyNote icon={Layers}>
                          {projectsOwnerView ? "No projects yet — publish your first one." : "No projects yet."}
                        </EmptyNote>
                      )}
                    </div>
                  );
                }
                if (tab.id.startsWith("type-")) {
                  const projectType = tab.id.slice("type-".length) as ProjectType;
                  return (
                    <div key={tab.id}>
                      <TypeCategoryPane
                        accountId={profile.id}
                        projectType={projectType}
                        showOwnerView={projectsOwnerView}
                      />
                    </div>
                  );
                }
                // A dynamic portfolio category — everything published
                // under an active Gig in this category.
                return (
                  <div key={tab.id}>
                    <PortfolioCategoryPane
                      accountId={profile.id}
                      category={tab.label}
                      showOwnerView={projectsOwnerView}
                    />
                  </div>
                );
              })}
            </SwipeableTabs>
          )}
        </div>
      </div>

      <BottomNav />

      {/* Floating action buttons. Stacked bottom-right, above BottomNav
          (which sits at z-40 — these stay under it, but the two never
          overlap spatially since this sits well above the nav's own
          height + safe area). "Back to post" only ever appears when
          this page was actually reached via a specific post's byline
          in the Feed (see fromFeedPost above); "scroll to top" is
          purely a function of scroll position. ako-pill-in gives each
          one the same soft scale+fade arrival already used for other
          "something just appeared" moments (see FollowButton.tsx). */}
      <div className="fixed right-4 z-chrome flex flex-col items-end gap-3 bottom-[calc(env(safe-area-inset-bottom)+9.5rem)] md:bottom-8">
        {fromFeedPost && (
          <button
            onClick={handleBackToFeedPost}
            className="ako-pill-in flex items-center gap-1.5 bg-ink text-canvas text-sm font-medium pl-3 pr-4 py-2.5 rounded-full shadow-lg"
            aria-label="Back to the post you came from"
          >
            <Undo2 size={16} />
            Back to post
          </button>
        )}
      </div>

      {avatarOpen && profile.avatar_url && (
        <MediaViewer
          mediaUrls={[profile.avatar_url]}
          startIndex={0}
          onClose={() => setAvatarOpen(false)}
        />
      )}

      {shareSheetOpen && !showOwnerView && (
        <ShareProfileSheet
          profile={{
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          }}
          isFollowedByUser={isFollowedByUser}
          isBlocked={isBlocked}
          isMuted={isMuted}
          onToggleBlock={handleToggleBlock}
          onToggleMute={() => toggleMute.mutate(isMuted)}
          onRemoveFollower={handleRemoveFollower}
          onOpenQR={() => setQrShareOpen(true)}
          onReportContent={() => setReportContentOpen(true)}
          onClose={() => setShareSheetOpen(false)}
        />
      )}

      {pagesOpen && showOwnerView && <ProfilePagesModal mode="owner" onClose={() => setPagesOpen(false)} />}
      {pagesOpen && !showOwnerView && hasPages && (
        <ProfilePagesModal mode="visitor" pages={profilePagesQuery.data ?? []} onClose={() => setPagesOpen(false)} />
      )}

      {reportContentOpen && (
        <ReportModal profileId={profile.id} onClose={() => setReportContentOpen(false)} />
      )}

      {qrShareOpen && (
        <ProfileShareScreen
          name={profile.display_name}
          handle={profile.username}
          avatarUrl={profile.avatar_url}
          url={`${APP_URL}/profile/${profile.username}`}
          onClose={() => setQrShareOpen(false)}
        />
      )}

      {showUnfollowConfirm && (
        <ConfirmDialog
          title={`Unfollow ${firstName || "this account"}?`}
          description={
            isFollowedByUser && profile.is_private
              ? `You and ${firstName} are friends, and this account is private — you'll need to send a new follow request and be approved again to follow them.`
              : isFollowedByUser
              ? `You and ${firstName} are friends. Still want to unfollow?`
              : `This account is private. If you unfollow, you'll need to send a new follow request and be approved again.`
          }
          confirmLabel="Unfollow"
          // Not styled as a red/danger action — unfollowing is
          // reversible and non-punitive, just worth a pause when it
          // affects a mutual relationship or resets a private
          // approval. Matches the accent-colored confirm this dialog
          // always used before the shared ConfirmDialog existed.
          danger={false}
          onConfirm={confirmUnfollow}
          onCancel={() => setShowUnfollowConfirm(false)}
        />
      )}

      {showRemoveFollowerConfirm && (
        <ConfirmDialog
          title={`Remove ${firstName || "this follower"}?`}
          description={`${
            firstName || "They"
          } will stop following you and won't be notified. They can choose to follow you again later.`}
          confirmLabel={removeFollower.isPending ? "Removing…" : "Remove"}
          onConfirm={confirmRemoveFollower}
          onCancel={() => setShowRemoveFollowerConfirm(false)}
        />
      )}

      {showBlockConfirm && (
        <ConfirmDialog
          title={`Block ${firstName || "this account"}?`}
          description={`${
            firstName || "They"
          } won't be able to find your profile, message you, or see anything you post. You'll also unfollow each other. You can unblock them anytime from Settings.`}
          confirmLabel={toggleBlock.isPending ? "Blocking…" : "Block"}
          onConfirm={confirmBlock}
          onCancel={() => setShowBlockConfirm(false)}
        />
      )}
    </div>
  );
}
