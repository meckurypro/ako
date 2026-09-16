// src/components/ProjectLinkSheet.tsx
import { useEffect, useRef, useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { Portal } from "./Portal";
import { Button } from "./Button";
import { useToast } from "./Toast";
import {
  useProjectSlugHolder,
  useCheckProjectSlugAvailable,
  useSetProjectSlug,
  type Project,
} from "../hooks/useProjects";
import { normalizeProjectSlug, getProjectSlugFormatError, getProjectUrl } from "../lib/projectLinks";

interface ProjectLinkSheetProps {
  project: Project;
  onClose: () => void;
}

/**
 * "Choose the address people will use to find this Project." Opened
 * from EditProject's "Project link" row. Saves independently of the
 * main form, same division of labour as ManageAccessSheet/
 * AffiliateProgramSheet — this isn't part of what "Save changes"
 * submits.
 */
export function ProjectLinkSheet({ project, onClose }: ProjectLinkSheetProps) {
  useBackDismiss(onClose);
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [slugInput, setSlugInput] = useState(project.slug ?? "");
  const [error, setError] = useState<string | null>(null);
  const checkId = useRef(0);
  const [debounced, setDebounced] = useState(normalizeProjectSlug(project.slug ?? ""));

  const holderId = project.posted_as_page_id ?? project.owner_id;
  const { data: holder, isLoading: loadingHolder } = useProjectSlugHolder(project);
  const setSlug = useSetProjectSlug();

  const normalized = normalizeProjectSlug(slugInput);
  const formatError = normalized.length > 0 ? getProjectSlugFormatError(normalized) : null;
  const unchanged = normalized === normalizeProjectSlug(project.slug ?? "");

  useEffect(() => {
    const id = ++checkId.current;
    const timeout = setTimeout(() => {
      if (id === checkId.current) setDebounced(normalized);
    }, 400);
    return () => clearTimeout(timeout);
  }, [normalized]);

  const { data: available, isFetching: checking } = useCheckProjectSlugAvailable(
    holderId,
    debounced,
    project.id
  );

  const previewUrl =
    holder && normalized
      ? getProjectUrl({ id: project.id, slug: normalized }, holder)
      : holder
        ? getProjectUrl(project, holder)
        : null;

  async function handleCopy() {
    const url = holder ? getProjectUrl(project, holder) : null;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast("Link copied.", { variant: "success" });
    } catch {
      // Clipboard blocked — nothing to do.
    }
  }

  async function handleSave() {
    setError(null);
    if (!normalized) {
      setError("Enter a link.");
      return;
    }
    if (formatError) {
      setError(formatError);
      return;
    }
    if (unchanged) {
      onClose();
      return;
    }
    if (debounced === normalized && available === false) {
      setError("That link is already taken. Try another.");
      return;
    }
    try {
      await setSlug.mutateAsync({ projectId: project.id, slug: normalized });
      toast("Project link updated.", { variant: "success" });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the link. Please try again.");
    }
  }

  const canSave = !!normalized && !formatError && !(debounced === normalized && checking) && !setSlug.isPending;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
        <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between px-4 pt-4 pb-2 sticky top-0 bg-surface">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Project link</p>
              <p className="text-xs text-ink-muted truncate">{project.title}</p>
            </div>
            <button onClick={onClose} className="text-ink-muted" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="px-4 pb-6">
            <p className="text-sm text-ink-muted mt-2 mb-4">
              This is the link people use to find this Project. You can change it any time — the old link will
              still bring people here.
            </p>

            {project.slug && (
              <div className="mb-4 p-3 rounded-xl bg-canvas border border-border flex items-center gap-2">
                <p className="flex-1 text-sm text-ink truncate">
                  {holder ? getProjectUrl(project, holder) : "…"}
                </p>
                <button
                  onClick={() => void handleCopy()}
                  disabled={!holder}
                  className="shrink-0 p-1.5 text-accent disabled:opacity-50"
                  aria-label="Copy link"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            )}

            <label className="block text-xs font-medium text-ink-muted mb-1">
              {project.slug ? "Change link" : "Choose a link"}
            </label>
            <input
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              maxLength={60}
              placeholder="my-first-book"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full bg-canvas rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
            />
            <p className="text-xs text-ink-muted mt-1 truncate">
              {loadingHolder ? "…" : previewUrl ?? "Set up your profile or page username first."}
            </p>

            {normalized && !formatError && !unchanged && (
              <>
                {debounced !== normalized || checking ? (
                  <p className="text-xs text-ink-muted mt-1.5">Checking availability…</p>
                ) : available ? (
                  <p className="text-xs text-accent mt-1.5">This link is available.</p>
                ) : (
                  <p className="text-xs text-danger mt-1.5">That link is already taken.</p>
                )}
              </>
            )}

            {error && (
              <p className="text-danger text-sm mt-3" role="alert">
                {error}
              </p>
            )}

            <Button className="mt-5" onClick={() => void handleSave()} loading={setSlug.isPending} disabled={!canSave}>
              {project.slug ? "Save link" : "Set link"}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
