// src/components/AffiliateShareSheet.tsx
import { useState } from "react";
import { X, Copy, Check, TrendingUp } from "lucide-react";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { Portal } from "./Portal";
import { Button } from "./Button";
import { useToast } from "./Toast";
import {
  useAffiliateProgram,
  useCurrentCommissionPct,
  useMyAffiliateRelationship,
  useCreateAffiliateRelationship,
  useAffiliateDashboard,
  affiliateLinkFor,
} from "../hooks/useAffiliates";
import { useFeatureFlag } from "../hooks/useFeatureFlags";
import { formatUsd } from "../lib/money";

interface AffiliateShareSheetProps {
  projectId: string;
  projectTitle: string;
  // The project's own canonical URL (see getProjectUrl in
  // src/lib/projectLinks.ts) to hang ?ref= off of. Optional so any
  // existing caller that doesn't have owner/page context handy keeps
  // working exactly as before, just without the pretty link.
  shareUrl?: string;
  onClose: () => void;
}

/**
 * Shown to a signed-in, non-owner visitor from ProjectDetail. Never
 * rendered for the owner or for a project with no enabled program —
 * ProjectDetail itself decides whether to open this at all (see the
 * "Share & earn" button there), same division of responsibility as
 * ManageAccessSheet/AffiliateProgramSheet being owner-only.
 */
export function AffiliateShareSheet({ projectId, projectTitle, shareUrl, onClose }: AffiliateShareSheetProps) {
  useBackDismiss(onClose);
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseUrl = shareUrl ?? `${window.location.origin}/projects/${projectId}`;

  const { data: program } = useAffiliateProgram(projectId);
  const { data: commissionPct } = useCurrentCommissionPct(program?.id);
  const { data: relationship, isLoading: loadingRelationship } = useMyAffiliateRelationship(projectId);
  const { data: dashboard } = useAffiliateDashboard(relationship?.status === "active" ? relationship.id : undefined);
  const createRelationship = useCreateAffiliateRelationship(projectId);
  // Only gates NEW joins below (the "Get my link" button) — an
  // already-active relationship's link/stats above render regardless.
  const affiliateProgramsEnabled = useFeatureFlag("affiliate_programs_enabled");

  async function handleFork() {
    setError(null);
    if (!affiliateProgramsEnabled) {
      setError("Affiliate programs are temporarily disabled.");
      return;
    }
    try {
      await createRelationship.mutateAsync();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't set up your affiliate link.");
    }
  }

  async function handleCopy(link: string) {
    try {
      if (navigator.share) {
        await navigator.share({ title: projectTitle, url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast("Link copied.", { variant: "success" });
    } catch {
      // Share sheet dismissed / clipboard blocked — nothing to do.
    }
  }

  const pctLabel = commissionPct !== null && commissionPct !== undefined ? `${Math.round(commissionPct * 100)}%` : null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
        <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between px-4 pt-4 pb-2 sticky top-0 bg-surface">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Share & earn</p>
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
              <p className="text-sm text-ink-muted py-6 text-center">
                Your affiliate access to this project was revoked by the creator.
              </p>
            ) : relationship?.status === "active" ? (
              <>
                <div className="mt-3 mb-4 p-3 rounded-xl bg-canvas border border-border flex items-center gap-2">
                  <p className="flex-1 text-sm text-ink truncate">{affiliateLinkFor(baseUrl, relationship.referral_token)}</p>
                  <button
                    onClick={() => void handleCopy(affiliateLinkFor(baseUrl, relationship.referral_token))}
                    className="shrink-0 p-1.5 text-accent"
                    aria-label="Copy link"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>

                <Button onClick={() => void handleCopy(affiliateLinkFor(baseUrl, relationship.referral_token))}>
                  Share my link
                </Button>

                <div className="grid grid-cols-2 gap-2 mt-5">
                  <StatTile label="Clicks" value={String(dashboard?.clicks ?? 0)} />
                  <StatTile label="Sales" value={String(dashboard?.completed_sales ?? 0)} />
                  <StatTile label="Pending" value={formatUsd(dashboard?.pending_commission ?? 0)} />
                  <StatTile label="Paid out" value={formatUsd(dashboard?.paid_commission ?? 0)} />
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <TrendingUp size={28} className="mx-auto text-accent mb-3" />
                <p className="text-sm text-ink mb-1">
                  {pctLabel
                    ? `Earn ${pctLabel} on every sale you bring in.`
                    : "Get your own link and earn on every sale you bring in."}
                </p>
                <p className="text-xs text-ink-muted mb-5">
                  Get a personal link for this project — anyone who buys through it counts as yours, even if they
                  sign up later.
                </p>
                {error && (
                  <p className="text-danger text-sm mb-3" role="alert">
                    {error}
                  </p>
                )}
                {affiliateProgramsEnabled ? (
                  <Button onClick={() => void handleFork()} loading={createRelationship.isPending}>
                    Get my link
                  </Button>
                ) : (
                  <p className="text-xs text-ink-muted">New affiliate links are temporarily unavailable.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-canvas rounded-xl border border-border p-3 text-center">
      <p className="font-display text-base text-ink truncate">{value}</p>
      <p className="text-[11px] text-ink-muted mt-0.5">{label}</p>
    </div>
  );
}
