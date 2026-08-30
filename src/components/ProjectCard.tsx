import { useState } from "react";
import { ExternalLink, Lock, Download, ImageIcon } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useHasPurchased, usePurchaseProject, useGetProjectFile, type Project } from "../hooks/useProjects";

export function ProjectCard({ project }: { project: Project }) {
  const { user } = useAuth();
  const isOwner = user?.id === project.owner_id;
  const isFree = project.price_usd <= 0;

  const hasPurchasedQuery = useHasPurchased(project.id);
  const purchaseProject = usePurchaseProject();
  const getFile = useGetProjectFile();

  const [error, setError] = useState<string | null>(null);
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

  return (
    <div className="bg-surface rounded-2xl overflow-hidden border border-border mb-3">
      <div className="aspect-video bg-canvas flex items-center justify-center">
        {project.thumbnail_url ? (
          <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={32} className="text-ink-muted" />
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg text-ink">{project.title}</h3>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
              isFree ? "bg-accent-soft text-accent" : "bg-surface border border-border text-ink"
            }`}
          >
            {isFree ? "Free" : `$${project.price_usd.toFixed(2)}`}
          </span>
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
              {purchaseProject.isPending ? "Purchasing…" : `Buy for $${project.price_usd.toFixed(2)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
