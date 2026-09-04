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
  Share2,
  Trash2,
  Bookmark,
  BookmarkCheck,
  Ticket,
  Users,
  Video,
  Music,
  BookOpen,
  Eye,
  Link as LinkIcon,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { renderFormattedText } from "../lib/formatText";
import {
  useHasPurchased,
  usePurchaseProject,
  useGetProjectFile,
  useSetProjectStatus,
  useDeleteProject,
  getEffectivePrice,
  isProjectFree,
  hasActivePromo,
  PROJECT_TYPE_LABELS,
  type Project,
} from "../hooks/useProjects";
import { useMediaDetails } from "../hooks/useProjectTypeDetails";
import { useIsProjectSaved, useToggleSavedProject } from "../hooks/useSavedProjects";
import { useProjectAccessCount } from "../hooks/useProjectAccess";

// File and URL keep the original single-link/download "unlock"
// pattern inline in the action row. Media gets its own block above
// that row (it can show up to two rows — audio and video — so it
// doesn't fit the single-line pattern). Event/Meeting/Room/Course
// each unlock into their own dedicated page instead — see TYPE_ROUTE.
const INLINE_TYPES: Project["project_type"][] = ["file", "url"];

const TYPE_ROUTE: Partial<Record<Project["project_type"], (id: string) => string>> = {
  event: (id) => `/projects/${id}/ticket`,
  meeting: (id) => `/meetings/${id}`,
  room: (id) => `/rooms/${id}`,
  course: (id) => `/courses/${id}`,
};

const TYPE_ICON: Partial<Record<Project["project_type"], typeof Ticket>> = {
  event: Ticket,
  meeting: Video,
  room: Users,
  course: BookOpen,
};

const TYPE_ACTION_LABEL: Partial<Record<Project["project_type"], string>> = {
  event: "View ticket",
  meeting: "Go to meeting",
  room: "Enter room",
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

export function ProjectCard({
  project,
  isOwnerView,
}: {
  project: Project;
  // Explicit owner-view flag from the caller (e.g. ProfilePage's
  // "viewing as visitor" toggle). Falls back to the plain owner check
  // for every other call site that doesn't pass it, so this stays a
  // no-op everywhere except the profile page's visitor-preview mode.
  isOwnerView?: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwner = isOwnerView ?? user?.id === project.owner_id;
  const isFree = isProjectFree(project);
  const showPromo = hasActivePromo(project);
  const effectivePrice = getEffectivePrice(project);
  const isCourseUnpublished = project.project_type === "course" && !project.published_at;

  const hasPurchasedQuery = useHasPurchased(project.id);
  const purchaseProject = usePurchaseProject();
  const getFileDownload = useGetProjectFile();
  const getAudioStream = useGetProjectFile();
  const getVideoStream = useGetProjectFile();
  const setStatus = useSetProjectStatus();
  const deleteProject = useDeleteProject();
  const isSavedQuery = useIsProjectSaved(project.id);
  const toggleSaved = useToggleSavedProject(project.id);
  const accessCountQuery = useProjectAccessCount(project.id);
  const { data: mediaDetails } = useMediaDetails(project.project_type === "media" ? project.id : undefined);

  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const hasPurchased = !!hasPurchasedQuery.data;
  const hasAccess = isOwner || isFree || hasPurchased;
  const isSaved = !!isSavedQuery.data;

  // Close the kebab menu on any click/tap outside it.
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

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

  async function handleShare() {
    setMenuOpen(false);
    // Always share a link BACK TO the project's own dedicated page on
    // Ako — never project.external_url, which points AWAY from Ako to
    // wherever the project itself links out to. Those are two
    // different things and only one of them is "sharing the project."
    const url = `${window.location.origin}/projects/${project.id}`;
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

  async function handleOpenFile() {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/projects/${project.id}`)}`);
      return;
    }
    setError(null);
    try {
      const url = await getFileDownload.mutateAsync({ projectId: project.id, kind: "file" });
      window.open(url, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't access file.");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load audio.");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load video.");
    }
  }

  function handleStatusChange(status: "active" | "draft" | "archived") {
    setStatus.mutate({ id: project.id, status });
    setMenuOpen(false);
  }

  async function handleDelete() {
    setMenuOpen(false);
    if (!window.confirm("Delete this project? This can't be undone.")) return;
    try {
      await deleteProject.mutateAsync(project.id);
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

  const aspectRatio =
    project.thumbnail_width && project.thumbnail_height
      ? `${project.thumbnail_width} / ${project.thumbnail_height}`
      : "16 / 9";

  const TypeIcon = TYPE_ICON[project.project_type];
  const isMedia = project.project_type === "media";
  const showOwnerBadges = isOwner && (project.status !== "active" || project.is_private);

  return (
    <div className="bg-surface rounded-2xl border border-border mb-3 relative">
      <div
        style={{ aspectRatio }}
        className="w-full bg-canvas flex items-center justify-center rounded-t-2xl overflow-hidden"
      >
        {project.thumbnail_url ? (
          <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={32} className="text-ink-muted" />
        )}
      </div>

      {/* Owner-only badges — visitors only ever see active, listed
          projects at all, so neither badge would make sense to them. */}
      {showOwnerBadges && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {project.status !== "active" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-ink text-canvas">
              {project.status === "draft"
                ? "Draft"
                : project.status === "cancelled"
                  ? "Cancelled"
                  : "Archived"}
            </span>
          )}
          {project.is_private && (
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-ink/80 text-canvas">
              <EyeOff size={10} />
              Private
            </span>
          )}
        </div>
      )}

      {/* Save toggle — sits left of the kebab for owners, alone
          top-right for everyone else. */}
      {!isOwner && (
        <button
          onClick={handleToggleSaved}
          aria-label={isSaved ? "Unsave project" : "Save project"}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-canvas/90 text-ink-muted"
        >
          {isSaved ? <BookmarkCheck size={16} className="text-accent" /> : <Bookmark size={16} />}
        </button>
      )}

      {isOwner && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-1.5 rounded-full bg-canvas/90 text-ink-muted"
            aria-label="Project options"
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <div className="absolute top-full right-0 mt-1 bg-canvas border border-border rounded-xl shadow-lg py-1 w-44 z-10">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate(`/projects/${project.id}/edit`);
                }}
                className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
              >
                <Pencil size={14} />
                Edit
              </button>

              <button
                onClick={handleShare}
                className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
              >
                <Share2 size={14} />
                Share
              </button>

              {project.status !== "active" && project.status !== "cancelled" && (
                <button
                  onClick={() => handleStatusChange("active")}
                  className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
                >
                  <Send size={14} />
                  Publish
                </button>
              )}

              {project.status === "active" && (
                <button
                  onClick={() => handleStatusChange("draft")}
                  className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
                >
                  <EyeOff size={14} />
                  Unpublish
                </button>
              )}

              {project.status !== "archived" && (
                <button
                  onClick={() => handleStatusChange("archived")}
                  className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-danger hover:bg-surface"
                >
                  <Archive size={14} />
                  Archive
                </button>
              )}

              {project.status === "archived" && (
                <button
                  onClick={() => handleStatusChange("draft")}
                  className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
                >
                  <RotateCcw size={14} />
                  Restore
                </button>
              )}

              <div className="h-px bg-border my-1" />

              <button
                onClick={handleDelete}
                disabled={deleteProject.isPending}
                className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-danger hover:bg-surface disabled:opacity-50"
              >
                <Trash2 size={14} />
                {deleteProject.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-lg text-ink truncate">{project.title}</h3>
            <span className="flex items-center gap-2 text-xs text-ink-muted">
              {PROJECT_TYPE_LABELS[project.project_type]}
              {/* Access count — paid or free, per-type wording kept
                  generic ("accessed") since download/stream/ticket/join
                  all count toward the same number. */}
              {(accessCountQuery.data ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Eye size={11} />
                  {accessCountQuery.data}
                </span>
              )}
            </span>
          </div>

          <div className="flex-shrink-0 text-right">
            {isFree ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent-soft text-accent">
                Free
              </span>
            ) : showPromo ? (
              <span className="flex items-center gap-1.5">
                <span className="text-xs text-ink-muted line-through">${project.price_usd.toFixed(2)}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent-soft text-accent">
                  ${effectivePrice.toFixed(2)}
                </span>
              </span>
            ) : (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface border border-border text-ink">
                ${project.price_usd.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {project.description && (
          <p className="text-sm text-ink-muted mt-1 whitespace-pre-wrap break-words">
            {renderFormattedText(project.description, "d")}
          </p>
        )}

        {error && <p className="text-danger text-sm mt-2">{error}</p>}

        {/* Media gets its own block above the action row — it can
            show up to two channel rows (audio, video), so it doesn't
            fit the single-line pattern the other inline types use. */}
        {isMedia && mediaDetails && (
          <div className="flex flex-col gap-2 mt-3">
            {mediaDetails.has_audio && (
              <div>
                {!hasAccess ? (
                  <span className="flex items-center gap-1.5 text-sm text-ink-muted">
                    <Lock size={15} />
                    Audio locked
                  </span>
                ) : mediaDetails.audio_source === "link" ? (
                  <a
                    href={mediaDetails.audio_url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-accent font-medium"
                  >
                    <Music size={15} />
                    Open audio link
                  </a>
                ) : audioSrc ? (
                  <audio controls autoPlay src={audioSrc} className="w-full h-9" />
                ) : (
                  <button
                    onClick={handlePlayAudio}
                    disabled={getAudioStream.isPending}
                    className="flex items-center gap-1.5 text-sm text-accent font-medium disabled:opacity-50"
                  >
                    <Music size={15} />
                    {getAudioStream.isPending ? "Loading…" : "Play audio"}
                  </button>
                )}
              </div>
            )}

            {mediaDetails.has_video && (
              <div>
                {!hasAccess ? (
                  <span className="flex items-center gap-1.5 text-sm text-ink-muted">
                    <Lock size={15} />
                    Video locked
                  </span>
                ) : mediaDetails.video_source === "link" ? (
                  <a
                    href={mediaDetails.video_url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-accent font-medium"
                  >
                    <Video size={15} />
                    Open video link
                  </a>
                ) : videoSrc ? (
                  <video controls autoPlay src={videoSrc} className="w-full rounded-lg max-h-72" />
                ) : (
                  <button
                    onClick={handlePlayVideo}
                    disabled={getVideoStream.isPending}
                    className="flex items-center gap-1.5 text-sm text-accent font-medium disabled:opacity-50"
                  >
                    <Video size={15} />
                    {getVideoStream.isPending ? "Loading…" : "Play video"}
                  </button>
                )}
              </div>
            )}
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

          {/* URL — a single link the host is selling/gating access to. */}
          {project.project_type === "url" &&
            (hasAccess ? (
              <a
                href={project.external_url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-accent font-medium"
              >
                <LinkIcon size={15} />
                Open link
              </a>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-ink-muted">
                <Lock size={15} />
                Locked
              </span>
            ))}

          {/* Event/Meeting/Room/Course — once unlocked, hand off to
              their own dedicated page rather than a link/download here. */}
          {!INLINE_TYPES.includes(project.project_type) &&
            !isMedia &&
            hasAccess &&
            TYPE_ROUTE[project.project_type] && (
              <button
                onClick={() => navigate(TYPE_ROUTE[project.project_type]!(project.id))}
                className="flex items-center gap-1.5 text-sm text-accent font-medium"
              >
                {TypeIcon && <TypeIcon size={15} />}
                {TYPE_ACTION_LABEL[project.project_type]}
              </button>
            )}

          {!INLINE_TYPES.includes(project.project_type) &&
            !isMedia &&
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

          {!hasAccess && !isFree && !isCourseUnpublished && (
            <button
              onClick={handleBuy}
              disabled={purchaseProject.isPending}
              className="ml-auto bg-accent text-canvas px-4 py-1.5 rounded-full text-sm font-medium disabled:opacity-50"
            >
              {purchaseProject.isPending
                ? "Purchasing…"
                : project.project_type === "event"
                  ? `Buy ticket $${effectivePrice.toFixed(2)}`
                  : project.project_type === "url"
                    ? `Get access for $${effectivePrice.toFixed(2)}`
                    : `Buy for $${effectivePrice.toFixed(2)}`}
            </button>
          )}

          <button
            onClick={handleShare}
            aria-label="Share project"
            className={`flex items-center gap-1.5 text-sm text-ink-muted ${
              hasAccess || isFree ? "" : "ml-auto"
            }`}
          >
            <Share2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
