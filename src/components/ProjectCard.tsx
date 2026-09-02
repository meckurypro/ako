// src/components/ProjectCard.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ExternalLink,
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
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
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

  const hasPurchasedQuery = useHasPurchased(project.id);
  const purchaseProject = usePurchaseProject();
  const getFile = useGetProjectFile();
  const setStatus = useSetProjectStatus();
  const deleteProject = useDeleteProject();

  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasPurchased = !!hasPurchasedQuery.data;
  const hasAccess = isOwner || isFree || hasPurchased;

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
    setError(null);
    try {
      await purchaseProject.mutateAsync(project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed.");
    }
  }

  async function handleShare() {
    setMenuOpen(false);
    // Always share a link BACK TO the project on Ako (this profile,
    // Projects tab) — never project.external_url, which points AWAY
    // from Ako to wherever the project itself links out to. Those are
    // two different things and only one of them is "sharing the
    // project."
    const url = `${window.location.origin}${window.location.pathname}?tab=projects`;
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
    setError(null);
    try {
      const url = await getFile.mutateAsync(project.id);
      window.open(url, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't access file.");
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

  const aspectRatio =
    project.thumbnail_width && project.thumbnail_height
      ? `${project.thumbnail_width} / ${project.thumbnail_height}`
      : "16 / 9";

  return (
    <div className="bg-surface rounded-2xl overflow-hidden border border-border mb-3 relative">
      <div
        style={{ aspectRatio }}
        className="w-full bg-canvas flex items-center justify-center"
      >
        {project.thumbnail_url ? (
          <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={32} className="text-ink-muted" />
        )}
      </div>

      {/* Owner-only status badge — visitors only ever see active
          projects at all, so this badge would never make sense to them. */}
      {isOwner && project.status !== "active" && (
        <span className="absolute top-3 left-3 text-xs font-medium px-2 py-0.5 rounded-full bg-ink text-canvas">
          {project.status === "draft" ? "Draft" : "Archived"}
        </span>
      )}

      {isOwner && (
        <div className="absolute top-3 right-3" ref={menuRef}>
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

              {project.status !== "active" && (
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
            <span className="text-xs text-ink-muted">{PROJECT_TYPE_LABELS[project.project_type]}</span>
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
          <p className="text-sm text-ink-muted mt-1">{project.description}</p>
        )}

        {error && <p className="text-danger text-sm mt-2">{error}</p>}

        <div className="flex items-center gap-2 mt-3">
          {project.external_url && hasAccess && (
            <a
              href={project.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-accent font-medium"
            >
              <ExternalLink size={15} />
              Open link
            </a>
          )}

          {project.file_path && (
            hasAccess ? (
              <button
                onClick={handleOpenFile}
                disabled={getFile.isPending}
                className="flex items-center gap-1.5 text-sm text-accent font-medium disabled:opacity-50"
              >
                <Download size={15} />
                {getFile.isPending ? "Preparing…" : "Download"}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-ink-muted">
                <Lock size={15} />
                Locked
              </span>
            )
          )}

          {!hasAccess && !isFree && (
            <button
              onClick={handleBuy}
              disabled={purchaseProject.isPending}
              className="ml-auto bg-accent text-canvas px-4 py-1.5 rounded-full text-sm font-medium disabled:opacity-50"
            >
              {purchaseProject.isPending ? "Purchasing…" : `Buy for $${effectivePrice.toFixed(2)}`}
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
