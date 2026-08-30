import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ExternalLink,
  Lock,
  Download,
  ImageIcon,
  MoreVertical,
  Pencil,
  Archive,
  RotateCcw,
  Send,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  useHasPurchased,
  usePurchaseProject,
  useGetProjectFile,
  useSetProjectStatus,
  getEffectivePrice,
  isProjectFree,
  hasActivePromo,
  PROJECT_TYPE_LABELS,
  type Project,
} from "../hooks/useProjects";

// --------------------------------------------------------
// Owner-only status actions, shown from the kebab menu depending on
// the project's current status. There's no hard-delete for projects
// in the schema (same soft-delete pattern as posts/comments
// elsewhere in the app, partly because purchases reference
// project_id) — so "delete" here means archive: it fully hides the
// project the same way a delete would from a visitor's perspective,
// while preserving purchase history integrity for anyone who already
// bought it. Labeled "Archive" rather than "Delete" so that's honest
// about what actually happens.
// --------------------------------------------------------

export function ProjectCard({ project }: { project: Project }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwner = user?.id === project.owner_id;
  const isFree = isProjectFree(project);
  const showPromo = hasActivePromo(project);
  const effectivePrice = getEffectivePrice(project);

  const hasPurchasedQuery = useHasPurchased(project.id);
  const purchaseProject = usePurchaseProject();
  const getFile = useGetProjectFile();
  const setStatus = useSetProjectStatus();

  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const hasPurchased = !!hasPurchasedQuery.data;
  const hasAccess = isOwner || isFree || hasPurchased;

  async function handleBuy() {
    setError(null);
    try {
      await purchaseProject.mutateAsync(project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed.");
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
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-1.5 rounded-full bg-canvas/90 text-ink-muted"
            aria-label="Project options"
          >
            <MoreVertical size={16} />
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
        </div>
      </div>
    </div>
  );
}
