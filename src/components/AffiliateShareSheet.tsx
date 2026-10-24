// src/components/AffiliateShareSheet.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, GitFork } from "lucide-react";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { Portal } from "./Portal";
import { Button } from "./Button";
import {
  useAffiliateProgram,
  useCurrentCommissionPct,
  useMyAffiliateRelationship,
  useCreateAffiliateRelationship,
} from "../hooks/useAffiliates";
import { useFeatureFlag } from "../hooks/useFeatureFlags";
import { friendlyError } from "../lib/friendlyError";

// Where forked projects (and their affiliate links) live.
export const FORKED_PROJECTS_PATH = "/wallet/affiliate-links";

interface AffiliateShareSheetProps {
  projectId: string;
  projectTitle: string;
  // Kept so existing callers compile; the link itself is copied from the Forked projects page.
  shareUrl?: string;
  onClose: () => void;
}

/**
 * Fork sheet for a signed-in, non-owner visitor. Forking adds the project to Forked projects and
 * sends the user straight there — the affiliate link is copied from that page, not here.
 * ProjectDetail/ProjectCard decide whether to open this at all.
 */
export function AffiliateShareSheet({ projectId, projectTitle, onClose }: AffiliateShareSheetProps) {
  useBackDismiss(onClose);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const { data: program } = useAffiliateProgram(projectId);
  const { data: commissionPct } = useCurrentCommissionPct(program?.id);
  const { data: relationship, isLoading: loadingRelationship } = useMyAffiliateRelationship(projectId);
  const createRelationship = useCreateAffiliateRelationship(projectId);
  // Only gates NEW forks — an existing fork is always viewable.
  const affiliateProgramsEnabled = useFeatureFlag("affiliate_programs_enabled");

  function goToForks() {
    onClose();
    navigate(FORKED_PROJECTS_PATH);
  }

  async function handleFork() {
    setError(null);
    if (!affiliateProgramsEnabled) {
      setError("Forking is temporarily off.");
      return;
    }
    try {
      await createRelationship.mutateAsync();
      goToForks();
    } catch (err) {
      setError(friendlyError(err, "Couldn't fork this project."));
    }
  }

  const pctLabel = commissionPct !== null && commissionPct !== undefined ? `${Math.round(commissionPct * 100)}%` : null;

  return (
    <Portal>
      <div className="fixed inset-0 ako-keyboard-aware z-50 flex items-center justify-center px-6">
        <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
        <div className="relative w-full max-w-xl bg-surface rounded-[28px] border border-border max-h-[calc(100dvh-10rem)] overflow-y-auto">
          <div className="flex items-center justify-between px-4 pt-4 pb-2 sticky top-0 bg-surface">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Fork & earn</p>
              <p className="text-xs text-ink-muted truncate">{projectTitle}</p>
            </div>
            <button onClick={onClose} className="text-ink-muted" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="px-4 pb-6">
            {loadingRelationship ? (
              <p className="text-sm text-ink-muted py-6 text-center">Loading…</p>
            ) : relationship?.status === "revoked" ? (
              <p className="text-sm text-ink-muted py-6 text-center">The creator revoked your fork.</p>
            ) : relationship?.status === "active" ? (
              <div className="text-center py-4">
                <GitFork size={28} className="mx-auto text-accent mb-3" />
                <p className="text-sm text-ink mb-5">You've forked this project.</p>
                <Button onClick={goToForks}>View forked projects</Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <GitFork size={28} className="mx-auto text-accent mb-3" />
                <p className="text-sm text-ink mb-1">
                  {pctLabel ? `Fork it. Earn ${pctLabel} on every sale.` : "Fork it. Earn on every sale."}
                </p>
                <p className="text-xs text-ink-muted mb-5">You get your own affiliate link.</p>
                {error && (
                  <p className="text-danger text-sm mb-3" role="alert">
                    {error}
                  </p>
                )}
                {affiliateProgramsEnabled ? (
                  <Button onClick={() => void handleFork()} loading={createRelationship.isPending}>
                    Fork project
                  </Button>
                ) : (
                  <p className="text-xs text-ink-muted">Forking is temporarily off.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
