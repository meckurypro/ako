// src/components/ProjectCard.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Download,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Archive,
  RotateCcw,
  Send,
  EyeOff,
  Redo2,
  Trash2,
  Bookmark,
  Ticket,
  Users,
  Video,
  Music,
  BookOpen,
  BookText,
  Eye,
  Link as LinkIcon,
  Briefcase,
  MessageCircle,
  Copy,
  Check,
  Heart,
  Megaphone,
  Play,
  Pause,
  Loader2,
  TrendingUp,
  Gift as GiftIcon,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useAffiliateProgram } from "../hooks/useAffiliates";
import { AffiliateShareSheet } from "./AffiliateShareSheet";
import { ConfirmDialog } from "./ConfirmDialog";
import { UnlockReveal } from "./UnlockReveal";
import { renderFormattedText } from "../lib/formatText";
import {
  useHasPurchased,
  usePurchaseProject,
  useBookGig,
  useGetProjectFile,
  useSetProjectStatus,
  useDeleteProject,
  getEffectivePrice,
  isProjectFree,
  hasActivePromo,
  PROJECT_TYPE_LABELS,
  type Project,
} from "../hooks/useProjects";
import { useMediaDetails, usePitchDetails, usePitchRaised, useBookDetails } from "../hooks/useProjectTypeDetails";
import { PREVIEW_SECONDS } from "./MediaPreviewPlayer";
import { useStopMediaWhenHidden } from "../hooks/useStopMediaWhenHidden";
import { useIsProjectSaved, useToggleSavedProject } from "../hooks/useSavedProjects";
import { useProjectAccessCount, useLogFreeProjectAccess } from "../hooks/useProjectAccess";
import { useStartConversation } from "../hooks/useMessaging";
import { ReactionTray, type EngagementAction } from "./ReactionTray";
import { GiftPicker } from "./GiftPicker";
import { ReactionMoreSheet } from "./ReactionMoreSheet";
import { DropdownMenu, type DropdownMenuItem } from "./DropdownMenu";
import { ManageAccessSheet } from "./ManageAccessSheet";
import { SupportPitchSheet } from "./SupportPitchSheet";
import { PrivateProjectNotice } from "./PrivateProjectNotice";
import { useToast } from "./Toast";
import { useIsProjectMember } from "../hooks/useProjectMembers";
import { resolveFunctionErrorMessage } from "../lib/functionErrors";

// File and URL keep the original single-link/download "unlock"
// pattern inline in the action row. Media's audio/video preview now
// lives on the card's own thumbnail instead (see MediaHeroPlayer);
// only its external "go to the full thing" links and the separate
// private image-channel deliverable still get their own block above
// that row. Event/Meeting/Course each unlock into their own
// dedicated page instead — see TYPE_ROUTE. Room used to be here too,
// but its "enter" action now lives in the Join engagement icon below
// (see middleActions) instead of a text link, since membership is an
// ongoing engagement state like Like/Save rather than a one-off
// unlock.
const INLINE_TYPES: Project["project_type"][] = ["file", "url"];

const TYPE_ROUTE: Partial<Record<Project["project_type"], (id: string) => string>> = {
  event: (id) => `/projects/${id}/ticket`,
  meeting: (id) => `/meetings/${id}`,
  course: (id) => `/courses/${id}`,
};

const TYPE_ICON: Partial<Record<Project["project_type"], typeof Ticket>> = {
  event: Ticket,
  meeting: Video,
  room: Users,
  course: BookOpen,
  gig: Briefcase,
  pitch: Heart,
};

const TYPE_ACTION_LABEL: Partial<Record<Project["project_type"], string>> = {
  event: "View ticket",
  meeting: "Go to meeting",
  course: "Continue course",
};

// --------------------------------------------------------
// Owner-only status actions, shown from the kebab menu depending on
// the project's current status, plus a real hard-delete via the
// delete-project edge function. Delete only succeeds when nobody has
// purchased the project (purchases.project_id references it, so a
// purchased project can't be removed without breaking purchase
// history) — the edge function catches that FK violation and
// returns a friendly message pointing the owner at Archive instead.
// --------------------------------------------------------

// A Media project's primary preview surface IS the card's own public
// thumbnail (project.thumbnail_url) — not a second, separate box
// further down the card. Tapping the overlay button on that
// thumbnail plays the uploaded audio in place (thumbnail stays put
// as the "now playing" backdrop) or, for video, swaps the poster for
// the actual video frame and plays it inline — same box either way.
// Deliberately independent of the Media project's own private
// "image channel" (has_image/image_file_path): that's a separate,
// privately-gated deliverable a creator can optionally attach (shown
// further down, with its own Download/Copy actions), not the public
// cover art this component uses. Access-gated the same way every
// other channel here is — a locked project shows a dimmed thumbnail
// with a lock icon instead of a play button, never the preview
// itself.
function MediaHeroPlayer({
  kind,
  thumbnailUrl,
  hasAccess,
  previewSrc,
  isLoadingPreview,
  onLoadPreview,
  autoLoadOnMount,
}: {
  kind: "audio" | "video";
  thumbnailUrl: string | null;
  hasAccess: boolean;
  previewSrc: string | null;
  isLoadingPreview: boolean;
  onLoadPreview: () => void;
  // Same reasoning as SongCoverPlayer's autoLoadOnMount: only the
  // single-card detail view fetches + autoplays the moment this
  // mounts. A feed/grid full of these must not fire a signed-URL
  // request for every card just for being on screen — the first tap
  // is what requests it there instead.
  autoLoadOnMount: boolean;
}) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const containerRef = useRef<HTMLButtonElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const requestedRef = useRef(false);

  // "Leaving" this card's preview — scrolled out of a feed/grid,
  // swiped to the other SwipeableTabs pane (ProfilePage's Projects
  // tab, which keeps both panes mounted — see that component's own
  // comment), or the card unmounting outright — always stops
  // playback. See useStopMediaWhenHidden's own comment for why this
  // is a separate concern from the autoplay-on-mount effect below.
  useStopMediaWhenHidden(containerRef, () => {
    mediaRef.current?.pause();
    setIsPlaying(false);
  });

  useEffect(() => {
    if (!autoLoadOnMount || !hasAccess || previewSrc) return;
    if (requestedRef.current) return;
    requestedRef.current = true;
    onLoadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoadOnMount, hasAccess]);

  // Autoplay the instant a preview URL lands, whether that came from
  // the eager mount-effect above or a manual tap in toggle() below.
  // Browsers can (and do) block unmuted autoplay outside a direct
  // user gesture — .play() returns a rejected promise in that case,
  // swallowed here and left showing the paused Play icon.
  useEffect(() => {
    if (!previewSrc) return;
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = 0;
    const playPromise = el.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [previewSrc]);

  // Loop within the preview cap: jump back to 0 and keep playing
  // instead of pausing dead at the cap.
  function handleTimeUpdate() {
    const el = mediaRef.current;
    if (!el) return;
    if (el.currentTime >= PREVIEW_SECONDS) {
      el.currentTime = 0;
      void el.play();
      setElapsed(0);
      return;
    }
    setElapsed(el.currentTime);
  }

  // A file shorter than the cap ends on its own — loop that too.
  function handleNativeEnded() {
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play();
    setElapsed(0);
  }

  function toggle() {
    // Nothing fetched yet — the tap itself is the request (or, for a
    // logged-out visitor, onLoadPreview redirects to login instead).
    if (!previewSrc) {
      onLoadPreview();
      return;
    }
    const el = mediaRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      void el.play();
      setIsPlaying(true);
    }
  }

  if (!hasAccess) {
    return (
      <div className="relative w-full h-full">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover opacity-50 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={32} className="text-ink-muted" />
          </div>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-ink/40 text-canvas">
          <Lock size={20} />
          <span className="text-xs font-medium">{kind === "video" ? "Video locked" : "Audio locked"}</span>
        </div>
      </div>
    );
  }

  const progressPct = previewSrc ? Math.min(100, (elapsed / PREVIEW_SECONDS) * 100) : 0;
  const elapsedSeconds = Math.min(PREVIEW_SECONDS, Math.floor(elapsed));
  const isBusy = isLoadingPreview && !previewSrc;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isBusy}
      aria-label={isPlaying ? `Pause ${kind}` : `Play ${kind}`}
      className="relative block w-full h-full disabled:cursor-default"
      ref={containerRef}
    >
      {kind === "video" && previewSrc ? (
        <video
          ref={(el) => {
            mediaRef.current = el;
          }}
          src={previewSrc}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleNativeEnded}
          playsInline
          className="w-full h-full object-cover"
        />
      ) : thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {kind === "video" ? (
            <Video size={32} className="text-ink-muted" />
          ) : (
            <Music size={32} className="text-ink-muted" />
          )}
        </div>
      )}
      {kind === "audio" && previewSrc && (
        <audio
          ref={(el) => {
            mediaRef.current = el;
          }}
          src={previewSrc}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleNativeEnded}
          className="hidden"
        />
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-ink/0 hover:bg-ink/10 transition-colors">
        <span className="flex items-center justify-center w-14 h-14 rounded-full bg-ink/60 text-canvas backdrop-blur-sm">
          {isBusy ? (
            <Loader2 size={22} className="animate-spin" />
          ) : isPlaying ? (
            <Pause size={22} fill="currentColor" />
          ) : (
            <Play size={22} fill="currentColor" className="ml-1" />
          )}
        </span>
      </span>
      {previewSrc && (
        <span className="absolute left-2 right-2 bottom-2 flex items-center gap-2">
          <span className="flex-1 h-1 rounded-full bg-canvas/40 overflow-hidden">
            <span className="block h-full bg-canvas transition-[width]" style={{ width: `${progressPct}%` }} />
          </span>
          <span className="text-[10px] text-canvas tabular-nums drop-shadow flex-shrink-0">
            {elapsedSeconds}s/{PREVIEW_SECONDS}s
          </span>
        </span>
      )}
    </button>
  );
}

export function ProjectCard({
  project,
  isOwnerView,
  isDetailView,
  shareUrl,
}: {
  project: Project;
  // Explicit owner-view flag from the caller (e.g. ProfilePage's
  // "viewing as visitor" toggle). Falls back to the plain owner check
  // for every other call site that doesn't pass it, so this stays a
  // no-op everywhere except the profile page's visitor-preview mode.
  isOwnerView?: boolean;
  // True only when this card IS the project detail page (ProjectDetail
  // renders exactly one of these, full-focus). Scopes the
  // autoplaying/looping song cover player to that single context —
  // feed lists, grids, Archive, SavedProjects etc. render many
  // ProjectCards at once and keep the old tap-to-preview buttons.
  isDetailView?: boolean;
  // The canonical public link for this project, when the caller
  // already has enough context (owner/page username) to build one —
  // see src/lib/projectLinks.ts. Falls back to the plain /projects/:id
  // route below when omitted, so every other existing call site keeps
  // working exactly as before.
  shareUrl?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwner = isOwnerView ?? user?.id === project.owner_id;
  // Same reasoning as PostCard's isArchivedFrozen — an archived
  // project's engagement is frozen (only ever relevant to the owner,
  // viewing their own archived project from the Archive screen). The
  // top-right "..." menu (Restore/Delete/Edit/etc., a few lines below)
  // is a separate control from this tray and stays fully usable —
  // it's already positioned at the top of the card, so nothing needs
  // to move for it the way PostCard needed a new bar added.
  const isArchivedFrozen = isOwner && project.status === "archived";
  const isFree = isProjectFree(project);
  const showPromo = hasActivePromo(project);
  const effectivePrice = getEffectivePrice(project);
  const isCourseUnpublished = project.project_type === "course" && !project.published_at;

  const hasPurchasedQuery = useHasPurchased(project.id);
  const purchaseProject = usePurchaseProject();
  const bookGig = useBookGig();
  const getFileDownload = useGetProjectFile();
  const getAudioStream = useGetProjectFile();
  const getVideoStream = useGetProjectFile();
  const getImageStream = useGetProjectFile();
  const setStatus = useSetProjectStatus();
  const deleteProject = useDeleteProject();
  const isSavedQuery = useIsProjectSaved(project.id);
  const toggleSaved = useToggleSavedProject(project.id);
  const toast = useToast();
  const accessCountQuery = useProjectAccessCount(project.id);
  const logFreeAccess = useLogFreeProjectAccess();
  const { data: mediaDetails } = useMediaDetails(project.project_type === "media" ? project.id : undefined);
  const isPitch = project.project_type === "pitch";
  const { data: pitchDetails } = usePitchDetails(isPitch ? project.id : undefined);
  const { data: pitchRaised } = usePitchRaised(isPitch ? project.id : undefined);
  const isBook = project.project_type === "book";
  const { data: bookDetails } = useBookDetails(isBook ? project.id : undefined);
  const getBookDownload = useGetProjectFile();
  // Same "built as a draft, can't be bought until published" shape as
  // Course, but only for an authored book — a link/upload Book is
  // complete the moment it's created, same as File/URL.
  const isBookDraftUnpublished = isBook && bookDetails?.content_source === "authored" && !project.published_at;
  const startConversation = useStartConversation();

  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  // Media never carries a price tag (see mediaDetails/isMedia below) —
  // gifting the creator(s) is the monetization path instead, the same
  // mechanism already used on posts. See useSendMediaGift/process_media_gift
  // for how a gift here splits across accepted collaborators.
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [manageAccessOpen, setManageAccessOpen] = useState(false);
  const [supportSheetOpen, setSupportSheetOpen] = useState(false);
  const [affiliateShareOpen, setAffiliateShareOpen] = useState(false);
  // Same gate as ProjectDetail's "Share & earn" button — pitches never
  // route through process_project_purchase, so there's no sale for a
  // commission to attach to. This is the ONLY reachable entry point
  // for media/file/url/gig: those four types never navigate into
  // ProjectDetail from this card at all (media/file/url resolve fully
  // inline; gig's card action is Message/Book, not a page link), so
  // without this, a real, enabled affiliate program on one of those
  // project types was completely unreachable — the toggle worked
  // server-side, there was just no UI path to "fork" it from anywhere
  // a visitor actually browses.
  const { data: affiliateProgram } = useAffiliateProgram(
    project.project_type !== "pitch" ? project.id : undefined
  );
  // Defensive re-check on top of the enabled flag: a program can have
  // been enabled while the project was paid, then the creator dropped
  // the price to 0 afterward (or a book lost is_own_work, which forces
  // price to 0 — see CreateProject/EditProject). A free project can
  // never be affiliated, no matter what the stored program row says.
  const canBecomeAffiliate = !!user && !isOwner && !!affiliateProgram?.enabled && project.price_usd > 0;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [imageLinkCopied, setImageLinkCopied] = useState(false);
  const hasPurchased = !!hasPurchasedQuery.data;
  // Rooms are the one project type where "free" isn't self-granting:
  // membership lives in room_members, and that row only gets created
  // by actually calling process_project_purchase() (see purchase-project
  // edge function) — even at $0. Every other type is fully unlocked by
  // isFree alone, no server round-trip needed.
  const isRoom = project.project_type === "room";
  const isMemberQuery = useIsProjectMember(project.id, project.is_private);
  const isMember = isMemberQuery.data === true;
  // Privacy is a separate gate from payment: a private project's
  // content/actions are hidden from anyone who isn't the owner or an
  // explicitly-added member, regardless of price — a free private
  // project still isn't accessible off the strength of its link alone
  // (see ako_projects_v4_private_membership.sql). Folding it into
  // hasAccess itself means every existing hasAccess check below
  // automatically respects it without touching each one individually.
  const privacyBlocked = project.is_private && !isOwner && !isMember;
  const hasAccess = !privacyBlocked && (isOwner || hasPurchased || (isFree && !isRoom));
  const isSaved = !!isSavedQuery.data;

  // Outside-click / back-dismiss for the kebab menu is handled
  // internally by <DropdownMenu> now.

  async function handleBuy() {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/projects/${project.id}`)}`);
      return;
    }
    setError(null);
    try {
      await purchaseProject.mutateAsync(project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed.");
    }
  }

  // Room membership is an ongoing engagement state (like Like/Save),
  // not a one-off unlock — so Join lives as a tray icon rather than a
  // text link. Once a member (hasAccess), the same icon acts as
  // "Enter room" instead. Free rooms still go through handleBuy for
  // the $0 purchase — see the isRoom comment above hasAccess — same
  // as before, just reached from the icon now instead of a pill.
  function handleJoinRoom() {
    if (hasAccess) {
      navigate(`/rooms/${project.id}`);
      return;
    }
    void handleBuy();
  }

  // Booking a gig pays the deposit AND drops the buyer straight into a
  // conversation with the host — book-gig hands back the conversation
  // id for exactly that, unlike handleBuy above.
  async function handleBookGig() {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/projects/${project.id}`)}`);
      return;
    }
    setError(null);
    try {
      const { conversationId } = await bookGig.mutateAsync(project.id);
      navigate(`/messages/${conversationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed.");
    }
  }

  // Gigs are lead-gen first — Message is always available regardless
  // of whether a booking fee has been paid, unlike the buy/unlock CTAs
  // for every other type.
  async function handleMessage() {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/projects/${project.id}`)}`);
      return;
    }
    setError(null);
    try {
      const conversationId = await startConversation.mutateAsync(project.owner_id);
      navigate(`/messages/${conversationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start conversation.");
    }
  }

  // The only way into a private project — opens (or resumes) a
  // conversation with the owner, with an editable draft message
  // prefilled rather than sent automatically, so it's genuinely the
  // visitor's own customised ask rather than a canned auto-message.
  // See MessageThread's draftMessage nav-state handling.
  async function handleRequestAccess() {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/projects/${project.id}`)}`);
      return;
    }
    setError(null);
    try {
      const conversationId = await startConversation.mutateAsync(project.owner_id);
      navigate(`/messages/${conversationId}`, {
        state: { draftMessage: `Hi! I'd like access to "${project.title}".` },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start conversation.");
    }
  }

  function handleSupported() {
    setSupportSheetOpen(false);
    toast("Thanks for backing this idea 🎉", { variant: "success" });
  }

  async function handleShare() {
    setMenuOpen(false);
    // Always share a link BACK TO the project's own dedicated page on
    // Ako — never project.external_url, which points AWAY from Ako to
    // wherever the project itself links out to. Those are two
    // different things and only one of them is "sharing the project."
    const url = shareUrl ?? `${window.location.origin}/projects/${project.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: project.title, url });
      } catch {
        // User cancelled the native share sheet — nothing to do.
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  // Paid access is already logged server-side by the purchase-project
  // edge function (via the service role) at purchase time — logging it
  // again here on every open/play would double-count it. Only a FREE,
  // non-owner unlock needs this client-side log at all, since that's
  // the one path nothing else records.
  function logFreeAccessIfNeeded(accessType: "download" | "stream" | "link_click") {
    if (isFree && !isOwner) {
      logFreeAccess.mutate({ projectId: project.id, accessType });
    }
  }

  async function handleOpenFile() {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/projects/${project.id}`)}`);
      return;
    }
    setError(null);
    // Open the tab synchronously, inside the click's own user-activation
    // window. Safari (and most mobile browsers) silently block
    // window.open() once it happens after an awaited network call — by
    // then it's no longer considered user-initiated — so waiting for the
    // signed URL before opening anything would make downloads randomly
    // fail with no error at all. Open a blank tab now, point it at the
    // real URL once we have it.
    const tab = window.open("", "_blank");
    try {
      const url = await getFileDownload.mutateAsync({ projectId: project.id, kind: "file" });
      if (tab) {
        tab.location.href = url;
      } else {
        // The blank-tab open itself got blocked — fall back to
        // navigating the current tab so the download still goes through.
        window.location.href = url;
      }
      logFreeAccessIfNeeded("download");
    } catch (err) {
      tab?.close();
      setError(await resolveFunctionErrorMessage(err, "Couldn't access file."));
    }
  }

  function handleOpenBookLink() {
    logFreeAccessIfNeeded("link_click");
  }

  async function handleDownloadBookFile() {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/projects/${project.id}`)}`);
      return;
    }
    setError(null);
    const tab = window.open("", "_blank");
    try {
      const url = await getBookDownload.mutateAsync({ projectId: project.id, kind: "book", action: "download" });
      if (tab) {
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
      logFreeAccessIfNeeded("download");
    } catch (err) {
      tab?.close();
      setError(await resolveFunctionErrorMessage(err, "Couldn't access file."));
    }
  }

  function handleOpenBookReader() {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/projects/${project.id}`)}`);
      return;
    }
    logFreeAccessIfNeeded("stream");
    navigate(`/projects/${project.id}/read`);
  }

  // URL projects skip the edge function entirely (the link itself is
  // already sitting on the project row, not behind a signed fetch), so
  // this is the only place a free open ever gets recorded for them.
  function handleOpenUrlLink() {
    logFreeAccessIfNeeded("link_click");
  }

  async function handleCopyLink() {
    if (!project.external_url) return;
    setError(null);
    try {
      await navigator.clipboard.writeText(project.external_url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setError("Couldn't copy link.");
    }
  }

  // Copies the signed URL currently loaded for the Media image
  // channel. Note this is a time-limited link (get-project-file mints
  // it with an expiry) rather than a permanent embed URL — fine for
  // "grab it now and paste it somewhere," not for a durable embed.
  async function handleCopyImageLink() {
    if (!imageSrc) return;
    setError(null);
    try {
      await navigator.clipboard.writeText(imageSrc);
      setImageLinkCopied(true);
      window.setTimeout(() => setImageLinkCopied(false), 2000);
    } catch {
      setError("Couldn't copy link.");
    }
  }

  // Media streaming — deliberately sets the signed URL as playback
  // src instead of window.open()-ing it: an uploaded audio/video
  // channel streams in place, with no download or redirect at all.
  async function handlePlayAudio() {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/projects/${project.id}`)}`);
      return;
    }
    setError(null);
    try {
      const url = await getAudioStream.mutateAsync({ projectId: project.id, kind: "audio" });
      setAudioSrc(url);
      logFreeAccessIfNeeded("stream");
    } catch (err) {
      setError(await resolveFunctionErrorMessage(err, "Couldn't load audio."));
    }
  }

  async function handlePlayVideo() {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/projects/${project.id}`)}`);
      return;
    }
    setError(null);
    try {
      const url = await getVideoStream.mutateAsync({ projectId: project.id, kind: "video" });
      setVideoSrc(url);
      logFreeAccessIfNeeded("stream");
    } catch (err) {
      setError(await resolveFunctionErrorMessage(err, "Couldn't load video."));
    }
  }

  async function handleViewImage() {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/projects/${project.id}`)}`);
      return;
    }
    setError(null);
    try {
      const url = await getImageStream.mutateAsync({ projectId: project.id, kind: "image" });
      setImageSrc(url);
      logFreeAccessIfNeeded("stream");
    } catch (err) {
      setError(await resolveFunctionErrorMessage(err, "Couldn't load image."));
    }
  }

  function handleStatusChange(status: "active" | "draft" | "archived") {
    setStatus.mutate({ id: project.id, status });
    setMenuOpen(false);
  }

  function handleDelete() {
    setMenuOpen(false);
    setShowDeleteConfirm(true);
  }

  // Routed through the app's own ConfirmDialog instead of
  // window.confirm — native confirm()/alert() don't work in this
  // app's WebView, so the old handleDelete's confirm() call silently
  // returned without ever prompting, and the function returned early
  // every time. Same fix already applied to every other destructive
  // action (chat delete, message delete, post delete) — this was the
  // one spot that hadn't been moved over yet, which is why "delete
  // project" specifically looked broken.
  async function handleConfirmDelete() {
    setShowDeleteConfirm(false);
    try {
      await deleteProject.mutateAsync(project.id);
      toast(`${project.title} deleted.`, { variant: "success" });
    } catch (err) {
      // Most likely reason: purchases exist and the delete was
      // refused server-side — surface that instead of failing silently.
      setError(err instanceof Error ? err.message : "Couldn't delete this project.");
    }
  }

  function handleToggleSaved() {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/projects/${project.id}`)}`);
      return;
    }
    toggleSaved.mutate(isSaved);
  }

  // Engagement row — same ReactionTray component and left/middle/right
  // shape as PostCard, for visual and interaction consistency across
  // posts and projects: Save/Join on the left-ish middle slot, Share
  // fixed right. Projects have no Like action (removed — liking a
  // project wasn't a meaningful signal here). Save doesn't make sense
  // on your own project, same as PostCard hides its owner-irrelevant
  // actions; Share and Join (as "Enter") stay available to the owner too.
  const leftActions: EngagementAction[] = [];

  const middleActions: EngagementAction[] = [
    ...(!isOwner
      ? [
          {
            key: "save",
            label: isSaved ? "Saved" : "Save",
            icon: (
              <Bookmark
                size={24}
                fill={isSaved ? "currentColor" : "none"}
                className={isSaved ? "text-accent" : "text-ink"}
              />
            ),
            count: null,
            onClick: handleToggleSaved,
          } satisfies EngagementAction,
        ]
      : []),
    // Gifting is Media's monetization path in place of a price tag
    // (see the isMedia block above/below) — the full asset streams
    // elsewhere via its link; a gift here is how someone shows up for
    // the creator(s) directly, splitting immediately across every
    // accepted collaborator plus the owner.
    ...(project.project_type === "media" && !isOwner
      ? [
          {
            key: "gift",
            label: "Gift",
            icon: <GiftIcon size={24} className="text-ink" />,
            count: null,
            onClick: () => setShowGiftPicker(true),
          } satisfies EngagementAction,
        ]
      : []),
    ...(isRoom
      ? [
          {
            key: "join",
            label: hasAccess ? "Enter cohort" : "Join cohort",
            icon: (
              <Users
                size={24}
                fill={hasAccess ? "currentColor" : "none"}
                className={hasAccess ? "text-accent" : "text-ink"}
              />
            ),
            count: null,
            onClick: handleJoinRoom,
          } satisfies EngagementAction,
        ]
      : []),
    // Share always makes sense for a non-owner (no header kebab exists
    // for them to find it in instead). For the owner it's dropped here
    // on purpose — it's already the header "···" menu's Share item, and
    // having the identical action reachable from two separate "···"
    // affordances on the same card was exactly the redundant-menu
    // confusion this consolidates. See rightActions below, which hides
    // the tray's own "···" entirely once this leaves it with nothing.
    ...(!isOwner
      ? [
          {
            key: "share",
            label: "Share",
            icon: <Redo2 size={24} className="text-ink" />,
            count: null,
            onClick: () => void handleShare(),
          } satisfies EngagementAction,
        ]
      : []),
  ];

  // Fixed right slot: "···" opens the same ReactionMoreSheet as
  // long-pressing any of the other icons. Only rendered when there's
  // actually something in middleActions to show — an owner with
  // nothing left there (Share moved to the header kebab, no Save on
  // your own project, not a Room) would otherwise get a second "···"
  // that opens an empty sheet, which is the exact redundant-menu
  // problem this whole change exists to fix.
  const rightActions: EngagementAction[] =
    middleActions.length > 0
      ? [
          {
            key: "more",
            label: "More",
            icon: <MoreHorizontal size={24} className="text-ink" />,
            count: null,
            onClick: () => setShowMoreActions(true),
          },
        ]
      : [];

  const aspectRatio =
    project.thumbnail_width && project.thumbnail_height
      ? `${project.thumbnail_width} / ${project.thumbnail_height}`
      : "16 / 9";

  const TypeIcon = TYPE_ICON[project.project_type];
  const isMedia = project.project_type === "media";
  // Video wins when a project has both channels — see the "Listen to
  // the full song" link further down for the audio side of that
  // case. null means there's no uploaded preview file to play at all
  // (image-only Media, or a channel that's link-only) — the hero
  // block then just shows the plain static thumbnail.
  const primaryMediaKind: "audio" | "video" | null =
    isMedia && mediaDetails?.has_video && mediaDetails.video_file_path
      ? "video"
      : isMedia && mediaDetails?.has_audio && mediaDetails.audio_file_path
        ? "audio"
        : null;
  const showOwnerBadges = isOwner && (project.status !== "active" || project.is_private);

  return (
    <div
      className={`group bg-surface rounded-[28px] border border-border/60 mb-4 relative overflow-hidden transition-shadow duration-300 shadow-[0_1px_2px_rgba(var(--shadow-ink-rgb),0.04),0_10px_28px_-16px_rgba(var(--shadow-ink-rgb),0.16)] ${
        isDetailView ? "" : "hover:shadow-[0_1px_2px_rgba(var(--shadow-ink-rgb),0.06),0_20px_44px_-18px_rgba(var(--shadow-ink-rgb),0.22)]"
      }`}
    >
      <div
        style={{ aspectRatio }}
        className="w-full bg-canvas flex items-center justify-center overflow-hidden"
      >
        {primaryMediaKind ? (
          <MediaHeroPlayer
            kind={primaryMediaKind}
            thumbnailUrl={project.thumbnail_url}
            hasAccess={hasAccess}
            previewSrc={primaryMediaKind === "video" ? videoSrc : audioSrc}
            isLoadingPreview={primaryMediaKind === "video" ? getVideoStream.isPending : getAudioStream.isPending}
            onLoadPreview={primaryMediaKind === "video" ? handlePlayVideo : handlePlayAudio}
            autoLoadOnMount={!!isDetailView}
          />
        ) : project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <ImageIcon size={32} className="text-ink-muted" />
        )}
      </div>

      {/* Owner-only badges — visitors only ever see active, listed
          projects at all, so neither badge would make sense to them. */}
      {showOwnerBadges && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {project.status !== "active" && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-ink/85 text-canvas backdrop-blur-md shadow-[0_2px_8px_rgba(var(--shadow-ink-rgb),0.18)]">
              {project.status === "draft"
                ? "Draft"
                : project.status === "cancelled"
                  ? "Cancelled"
                  : "Archived"}
            </span>
          )}
          {project.is_private && (
            <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-ink/70 text-canvas backdrop-blur-md shadow-[0_2px_8px_rgba(var(--shadow-ink-rgb),0.18)]">
              <EyeOff size={10} />
              Private
            </span>
          )}
        </div>
      )}

      {isOwner && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            ref={menuButtonRef}
            onClick={() => setMenuOpen((o) => !o)}
            className="p-1.5 rounded-full bg-canvas/90 backdrop-blur-md text-ink-muted shadow-[0_2px_8px_rgba(var(--shadow-ink-rgb),0.14)] transition-colors hover:text-ink"
            aria-label="Project options"
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <DropdownMenu
              anchorRef={menuButtonRef}
              onClose={() => setMenuOpen(false)}
              widthClass="w-56"
              items={(() => {
                const menuItems: (DropdownMenuItem | "divider")[] = [
                  {
                    key: "edit",
                    label: "Edit",
                    icon: <Pencil />,
                    onSelect: () => navigate(`/projects/${project.id}/edit`),
                  },
                  { key: "share", label: "Share", icon: <Redo2 />, onSelect: handleShare },
                ];
                // "Push" — jumps straight to Compose with this project
                // pre-tagged, ready for the caption. Only offered for
                // a published (active), non-private project: pushing a
                // draft/archived project or a private one would tag
                // something the eventual post's audience can't actually
                // see (same "active + not private" rule TagProjectPicker
                // already enforces for the other way into this same flow).
                if (project.status === "active" && !project.is_private) {
                  menuItems.push({
                    key: "push",
                    label: "Push",
                    icon: <Megaphone />,
                    onSelect: () =>
                      navigate("/compose", {
                        state: { taggedProject: { id: project.id, title: project.title } },
                      }),
                  });
                }
                if (project.is_private) {
                  menuItems.push({
                    key: "manage-access",
                    label: "Manage access",
                    icon: <Users />,
                    onSelect: () => setManageAccessOpen(true),
                  });
                }
                if (project.status !== "active" && project.status !== "cancelled") {
                  menuItems.push({
                    key: "publish",
                    label: "Publish",
                    icon: <Send />,
                    onSelect: () => handleStatusChange("active"),
                  });
                }
                if (project.status === "active") {
                  menuItems.push({
                    key: "unpublish",
                    label: "Unpublish",
                    icon: <EyeOff />,
                    onSelect: () => handleStatusChange("draft"),
                  });
                }
                if (project.status !== "archived") {
                  menuItems.push({
                    key: "archive",
                    label: "Archive",
                    icon: <Archive />,
                    variant: "danger",
                    onSelect: () => handleStatusChange("archived"),
                  });
                }
                if (project.status === "archived") {
                  menuItems.push({
                    key: "restore",
                    label: "Restore",
                    icon: <RotateCcw />,
                    onSelect: () => handleStatusChange("draft"),
                  });
                }
                menuItems.push(
                  "divider",
                  {
                    key: "delete",
                    label: deleteProject.isPending ? "Deleting…" : "Delete",
                    icon: <Trash2 />,
                    variant: "danger",
                    disabled: deleteProject.isPending,
                    onSelect: handleDelete,
                  }
                );
                return menuItems;
              })()}
            />
          )}
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold tracking-tight text-ink truncate">{project.title}</h3>
            <span className="flex items-center gap-2 text-xs text-ink-muted mt-0.5">
              {PROJECT_TYPE_LABELS[project.project_type]}
              {/* Access count — paid or free, per-type wording kept
                  generic ("accessed") since download/stream/ticket/join
                  all count toward the same number. */}
              {(accessCountQuery.data ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-ink-muted/50" />
                  <Eye size={11} />
                  {accessCountQuery.data}
                </span>
              )}
            </span>
          </div>

          <div className="flex-shrink-0 text-right">
            {isPitch ? (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-soft text-accent shadow-sm">
                ${(pitchRaised ?? 0).toFixed(0)} raised
              </span>
            ) : isFree && project.project_type === "gig" ? (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-soft text-accent shadow-sm">
                Message to inquire
              </span>
            ) : isFree ? (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-soft text-accent shadow-sm">
                Free
              </span>
            ) : showPromo ? (
              <span className="flex items-center gap-1.5">
                <span className="text-xs text-ink-muted line-through">${project.price_usd.toFixed(2)}</span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-soft text-accent shadow-sm">
                  ${effectivePrice.toFixed(2)}
                </span>
              </span>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface border border-border text-ink shadow-sm">
                ${project.price_usd.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {privacyBlocked ? (
          <PrivateProjectNotice onMessage={() => void handleRequestAccess()} messagePending={startConversation.isPending} />
        ) : (
          <UnlockReveal unlocked={hasAccess}>
        {project.description && (
          <p className="text-sm text-ink-muted mt-1 whitespace-pre-wrap break-words">
            {renderFormattedText(project.description, "d")}
          </p>
        )}

        {/* Goal-progress bar — informational only, per the
            keep-what-you-raise decision: hitting or missing
            goal_amount_usd changes nothing about what the creator can
            access from what's already been pledged. */}
        {isPitch && pitchDetails && (
          <div className="mt-2.5">
            <div className="h-1.5 w-full rounded-full bg-canvas overflow-hidden">
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${Math.min(100, ((pitchRaised ?? 0) / pitchDetails.goal_amount_usd) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-ink-muted mt-1">
              ${(pitchRaised ?? 0).toFixed(0)} raised of ${pitchDetails.goal_amount_usd.toFixed(0)} goal
            </p>
          </div>
        )}

        {error && <p className="text-danger text-sm mt-2">{error}</p>}

        {/* Media's playable preview lives on the card's own thumbnail
            now (see MediaHeroPlayer above) — this block only holds
            what doesn't fit there: external "go to the full thing"
            links, and the separate private image-channel deliverable
            (has_image), which is unrelated to the public thumbnail. */}
        {isMedia && mediaDetails && (
          <div className="flex flex-col gap-3 mt-3">
            {/* Audio + video together on the same Media project: the
                thumbnail already plays the video (see
                primaryMediaKind above) — a single link here sends
                people to the audio's own home (Spotify, Fanlink,
                etc.) instead of a second full preview. */}
            {mediaDetails.has_audio && mediaDetails.has_video ? (
              hasAccess &&
              mediaDetails.audio_url && (
                <a
                  href={mediaDetails.audio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-accent font-medium"
                >
                  <Music size={15} />
                  Listen to the full song
                </a>
              )
            ) : mediaDetails.has_audio ? (
              hasAccess &&
              mediaDetails.audio_url && (
                <a
                  href={mediaDetails.audio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-accent font-medium"
                >
                  <Music size={15} />
                  Go to full track
                </a>
              )
            ) : (
              hasAccess &&
              mediaDetails.video_url && (
                <a
                  href={mediaDetails.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-accent font-medium"
                >
                  <Video size={15} />
                  Go to full video
                </a>
              )
            )}

            {/* Image — always upload-only, never a redirect (see
                MediaFields). Shown in full once loaded, plus an
                explicit Download and Copy link, same pattern as
                File/URL — on top of, not instead of, the ordinary
                right-click-to-save every <img> already supports. */}
            {mediaDetails.has_image && (
              <div>
                {!hasAccess ? (
                  <span className="flex items-center gap-1.5 text-sm text-ink-muted">
                    <Lock size={15} />
                    Image locked
                  </span>
                ) : imageSrc ? (
                  <div className="flex flex-col gap-2">
                    <img src={imageSrc} alt="" className="w-full rounded-lg max-h-72 object-contain" />
                    <div className="flex items-center gap-3">
                      <a
                        href={imageSrc}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-accent font-medium"
                      >
                        <Download size={15} />
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyImageLink}
                        className="flex items-center gap-1.5 text-sm text-ink-muted font-medium"
                      >
                        {imageLinkCopied ? (
                          <>
                            <Check size={15} className="text-accent" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={15} />
                            Copy link
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-ink-muted">Link expires after a while — copy again if it stops working.</p>
                  </div>
                ) : (
                  <button
                    onClick={handleViewImage}
                    disabled={getImageStream.isPending}
                    className="flex items-center gap-1.5 text-sm text-accent font-medium disabled:opacity-50"
                  >
                    <ImageIcon size={15} />
                    {getImageStream.isPending ? "Loading…" : "View image"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Book needs its own block above the action row too — its
            three content_source values need completely different
            actions, the same reasoning as Media above. */}
        {isBook && bookDetails && hasAccess && (
          <div className="flex flex-col gap-3 mt-3">
            {bookDetails.content_source === "link" && (
              <div className="flex items-center gap-3">
                <a
                  href={bookDetails.external_url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleOpenBookLink}
                  className="flex items-center gap-1.5 text-sm text-accent font-medium"
                >
                  <LinkIcon size={15} />
                  Open link
                </a>
              </div>
            )}
            {bookDetails.content_source === "upload" && (
              <div className="flex items-center gap-3">
                {bookDetails.allow_read_in_app && (
                  <button
                    onClick={handleOpenBookReader}
                    className="flex items-center gap-1.5 text-sm text-accent font-medium"
                  >
                    <BookText size={15} />
                    Read
                  </button>
                )}
                {bookDetails.allow_download && (
                  <button
                    onClick={handleDownloadBookFile}
                    disabled={getBookDownload.isPending}
                    className="flex items-center gap-1.5 text-sm text-accent font-medium disabled:opacity-50"
                  >
                    <Download size={15} />
                    {getBookDownload.isPending ? "Preparing…" : "Download"}
                  </button>
                )}
              </div>
            )}
            {bookDetails.content_source === "authored" && (
              <button
                onClick={() => navigate(`/books/${project.id}`)}
                className="flex items-center gap-1.5 text-sm text-accent font-medium"
              >
                <BookOpen size={15} />
                {isOwner && !project.published_at ? "Continue building" : "Read"}
              </button>
            )}
          </div>
        )}
        {isBook && bookDetails && !hasAccess && !isOwner && (
          <div className="flex items-center gap-1.5 text-sm text-ink-muted mt-3">
            <Lock size={15} />
            Locked
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          {/* File — hosted download, no external link ever stored. */}
          {project.project_type === "file" &&
            (hasAccess ? (
              <button
                onClick={handleOpenFile}
                disabled={getFileDownload.isPending}
                className="flex items-center gap-1.5 text-sm text-accent font-medium disabled:opacity-50"
              >
                <Download size={15} />
                {getFileDownload.isPending ? "Preparing…" : "Download"}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-ink-muted">
                <Lock size={15} />
                Locked
              </span>
            ))}

          {/* URL — a single link the host is selling/gating access to.
              "Open link" navigates there directly; "Copy" hands the
              visitor the raw URL instead, for pasting into another app
              (e.g. the WhatsApp invite this often is) rather than
              opening it inside the in-app browser. */}
          {project.project_type === "url" &&
            (hasAccess ? (
              <div className="flex items-center gap-3">
                <a
                  href={project.external_url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleOpenUrlLink}
                  className="flex items-center gap-1.5 text-sm text-accent font-medium"
                >
                  <LinkIcon size={15} />
                  Open link
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 text-sm text-ink-muted font-medium"
                >
                  {linkCopied ? (
                    <>
                      <Check size={15} className="text-accent" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={15} />
                      Copy
                    </>
                  )}
                </button>
              </div>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-ink-muted">
                <Lock size={15} />
                Locked
              </span>
            ))}

          {/* Event/Meeting/Course — once unlocked, hand off to their
              own dedicated page rather than a link/download here. An
              event's owner never buys their own ticket, so they get
              the door-scanner page here instead of "View ticket". */}
          {!INLINE_TYPES.includes(project.project_type) &&
            !isMedia &&
            !isBook &&
            hasAccess &&
            TYPE_ROUTE[project.project_type] && (
              <button
                onClick={() =>
                  navigate(
                    project.project_type === "event" && isOwner
                      ? `/projects/${project.id}/checkin`
                      : TYPE_ROUTE[project.project_type]!(project.id)
                  )
                }
                className="flex items-center gap-1.5 text-sm text-accent font-medium"
              >
                {TypeIcon && <TypeIcon size={15} />}
                {project.project_type === "event" && isOwner ? "Scan tickets" : TYPE_ACTION_LABEL[project.project_type]}
              </button>
            )}

          {!INLINE_TYPES.includes(project.project_type) &&
            !isMedia &&
            !isBook &&
            project.project_type !== "gig" &&
            project.project_type !== "pitch" &&
            !hasAccess &&
            !isCourseUnpublished && (
              <span className="flex items-center gap-1.5 text-sm text-ink-muted">
                <Lock size={15} />
                Locked
              </span>
            )}

          {isCourseUnpublished && isOwner && (
            <span className="text-sm text-ink-muted">Not published yet</span>
          )}

          {isBookDraftUnpublished && isOwner && (
            <span className="text-sm text-ink-muted">Not published yet</span>
          )}

          {/* Gig — Message is always available (lead-gen first), plus an
              optional "Book for $X" once a booking fee is set and hasn't
              been paid yet. Independent of hasAccess/isFree, unlike every
              other type's CTA. */}
          {project.project_type === "gig" && !isOwner && (
            <button
              onClick={handleMessage}
              disabled={startConversation.isPending}
              className="flex items-center gap-1.5 text-sm text-accent font-medium disabled:opacity-50"
            >
              <MessageCircle size={15} />
              {startConversation.isPending ? "Opening…" : "Message"}
            </button>
          )}

          {project.project_type === "gig" && !isOwner && !isFree && hasPurchased && (
            <span className="flex items-center gap-1.5 text-sm text-ink-muted ml-2">
              Booked ✓
            </span>
          )}

          {/* Pitch — always viewable (it's never locked by payment),
              so Support is its own pill rather than gated behind
              hasAccess like the generic Buy pill below. */}
          {isPitch && !isOwner && (
            <button
              onClick={() => setSupportSheetOpen(true)}
              className="ml-auto flex items-center gap-1.5 bg-accent text-canvas px-4 py-1.5 rounded-full text-sm font-semibold shadow-[0_4px_14px_-4px_rgba(var(--shadow-ink-rgb),0.35)] transition-transform active:scale-[0.97]"
            >
              <Heart size={15} />
              Support
            </button>
          )}

          {/* Buy/Book pill for everything except Room, which now joins
              via the Join engagement icon below instead — price is
              still visible up top in the badge next to the title. */}
          {project.project_type !== "room" &&
            project.project_type !== "pitch" &&
            !hasAccess &&
            !isCourseUnpublished &&
            !isBookDraftUnpublished && (
            <button
              onClick={project.project_type === "gig" ? handleBookGig : handleBuy}
              disabled={project.project_type === "gig" ? bookGig.isPending : purchaseProject.isPending}
              className="ml-auto bg-accent text-canvas px-4 py-1.5 rounded-full text-sm font-semibold shadow-[0_4px_14px_-4px_rgba(var(--shadow-ink-rgb),0.35)] transition-transform active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
            >
              {project.project_type === "gig"
                ? bookGig.isPending
                  ? "Booking…"
                  : `Book for $${effectivePrice.toFixed(2)}`
                : purchaseProject.isPending
                  ? "Purchasing…"
                  : project.project_type === "event"
                    ? `Buy ticket $${effectivePrice.toFixed(2)}`
                    : project.project_type === "url"
                      ? `Get access for $${effectivePrice.toFixed(2)}`
                      : `Buy for $${effectivePrice.toFixed(2)}`}
            </button>
          )}
        </div>

        {/* Only when this card is NOT already inside ProjectDetail —
            that page renders its own identical button right after
            <ProjectCard isDetailView />, so this would otherwise
            double up there. */}
        {canBecomeAffiliate && !isDetailView && (
          <button
            onClick={() => setAffiliateShareOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-accent-soft text-accent py-2.5 rounded-2xl font-semibold text-sm mb-2 transition-transform active:scale-[0.98]"
          >
            <TrendingUp size={15} />
            Share & earn a commission
          </button>
        )}

        <div className="mt-1 pt-3 border-t border-border/60">
          <ReactionTray
            leftActions={leftActions}
            middleActions={middleActions}
            rightActions={rightActions}
            onOpenMore={isArchivedFrozen || middleActions.length === 0 ? undefined : () => setShowMoreActions(true)}
            disabled={isArchivedFrozen}
          />
        </div>

        {showMoreActions && !isArchivedFrozen && middleActions.length > 0 && (
          <ReactionMoreSheet actions={middleActions} onClose={() => setShowMoreActions(false)} />
        )}

        {showGiftPicker && (
          // No single "recipient" to name for a Media gift — it splits
          // across every accepted collaborator plus the owner (see
          // process_media_gift) — so the header shows the project
          // itself rather than one person. recipientId/postId/commentId
          // are unused on this path; projectId is what actually drives
          // the send (see useSendMediaGift).
          <GiftPicker
            recipientId={project.owner_id}
            recipientName={project.title}
            recipientAvatar={project.thumbnail_url}
            projectId={project.id}
            onClose={() => setShowGiftPicker(false)}
          />
        )}
          </UnlockReveal>
        )}
      </div>

      {manageAccessOpen && (
        <ManageAccessSheet
          projectId={project.id}
          projectTitle={project.title}
          onClose={() => setManageAccessOpen(false)}
        />
      )}

      {supportSheetOpen && (
        <SupportPitchSheet
          projectId={project.id}
          projectTitle={project.title}
          onClose={() => setSupportSheetOpen(false)}
          onSupported={handleSupported}
        />
      )}

      {affiliateShareOpen && (
        <AffiliateShareSheet
          projectId={project.id}
          projectTitle={project.title}
          onClose={() => setAffiliateShareOpen(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete this project?"
          description="This can't be undone."
          confirmLabel={deleteProject.isPending ? "Deleting…" : "Delete"}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
