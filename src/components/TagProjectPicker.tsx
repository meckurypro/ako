// src/components/TagProjectPicker.tsx
import { ImageIcon, X } from "lucide-react";
import { Portal } from "./Portal";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { useUserProjects } from "../hooks/useProjects";
import { PROJECT_TYPE_LABELS } from "../hooks/useProjects";

/**
 * Item 10's project picker for Compose — deliberately scoped to the
 * poster's OWN active, public projects (useUserProjects(userId, false),
 * same "active + not private" filter the profile's own Projects tab
 * uses for visitors). Two reasons for that scope, not a technical
 * limitation:
 *
 *  1. Tagging someone else's project isn't what item 10 described
 *     ("its thumbnail, title, and creator name" reads as promoting
 *     your own work in a post, the way @mentions promote a person).
 *     If cross-account tagging turns out to be wanted too, this is
 *     the file to widen — it'd need a project search, not just a
 *     list, and that's a bigger UI than this ticket asked for.
 *  2. Restricting to public projects avoids a private project's
 *     thumbnail/title leaking into a public post's tagged-project
 *     embed for people who don't have access to the project itself.
 */
export function TagProjectPicker({
  userId,
  onSelect,
  onClose,
}: {
  userId: string;
  onSelect: (projectId: string, title: string) => void;
  onClose: () => void;
}) {
  useBackDismiss(onClose);
  useScrollLock();
  const { data: projects, isLoading } = useUserProjects(userId, false);

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />
        <div className="relative w-full sm:max-w-sm max-h-[70vh] bg-surface rounded-t-2xl sm:rounded-2xl border border-border overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <p className="font-medium text-ink">Tag a project</p>
            <button onClick={onClose} className="p-1 text-ink-muted" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {isLoading && <p className="text-sm text-ink-muted text-center py-6">Loading…</p>}

            {!isLoading && (!projects || projects.length === 0) && (
              <p className="text-sm text-ink-muted text-center py-6 px-4">
                You don't have any published projects to tag yet.
              </p>
            )}

            {projects?.map((project) => (
              <button
                key={project.id}
                onClick={() => onSelect(project.id, project.title)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-canvas transition-colors"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-canvas border border-border flex-shrink-0 flex items-center justify-center">
                  {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={14} className="text-ink-muted" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-ink-muted font-medium">
                    {PROJECT_TYPE_LABELS[project.project_type]}
                  </p>
                  <p className="text-sm font-medium text-ink truncate">{project.title}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Portal>
  );
}
