// src/pages/MyAffiliateLinks.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft, TrendingUp, Copy, Check, ImageIcon } from "lucide-react";
import {
  useMyAffiliateRelationships,
  useAffiliateDashboard,
  affiliateLinkFor,
  type AffiliateRelationshipWithProject,
} from "../hooks/useAffiliates";
import { useToast } from "../components/Toast";
import { formatUsd } from "../lib/money";
import { getEffectivePrice } from "../hooks/useProjects";
import { getProjectUrl, type ProjectSlugHolder } from "../lib/projectLinks";

function AffiliateLinkRow({ relationship }: { relationship: AffiliateRelationshipWithProject }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const { data: dashboard } = useAffiliateDashboard(
    relationship.status === "active" ? relationship.id : undefined
  );

  async function handleCopy() {
    const holder: ProjectSlugHolder | null = relationship.project?.posted_as_page
      ? { type: "page", username: relationship.project.posted_as_page.username }
      : relationship.project?.owner
        ? { type: "profile", username: relationship.project.owner.username }
        : null;
    const baseUrl = relationship.project
      ? getProjectUrl(relationship.project, holder)
      : `${window.location.origin}/projects/${relationship.project_id}`;
    const link = affiliateLinkFor(baseUrl, relationship.referral_token);
    try {
      if (navigator.share) {
        await navigator.share({ title: relationship.project?.title, url: link });
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

  // The project can no longer exist (deleted) even though the
  // relationship row does — don't render a broken link into nowhere.
  if (!relationship.project) return null;

  return (
    <div className="bg-surface rounded-2xl border border-border p-4 mb-3">
      <div className="flex items-center gap-3 mb-3">
        <Link
          to={`/projects/${relationship.project_id}`}
          className="w-12 h-12 rounded-xl bg-canvas overflow-hidden flex items-center justify-center shrink-0"
        >
          {relationship.project.thumbnail_url ? (
            <img src={relationship.project.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={18} className="text-ink-muted" />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/projects/${relationship.project_id}`} className="text-sm font-medium text-ink truncate block">
            {relationship.project.title}
          </Link>
          <p className="text-xs text-ink-muted">{formatUsd(getEffectivePrice(relationship.project))}</p>
        </div>
        {relationship.status === "revoked" ? (
          <span className="text-xs text-ink-muted shrink-0">Revoked</span>
        ) : (
          <button onClick={() => void handleCopy()} className="shrink-0 p-1.5 text-accent" aria-label="Copy link">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        )}
      </div>

      {relationship.status === "active" && (
        <div className="grid grid-cols-4 gap-2">
          <MiniStat label="Clicks" value={String(dashboard?.clicks ?? 0)} />
          <MiniStat label="Sales" value={String(dashboard?.completed_sales ?? 0)} />
          <MiniStat label="Pending" value={formatUsd(dashboard?.pending_commission ?? 0)} />
          <MiniStat label="Paid" value={formatUsd(dashboard?.paid_commission ?? 0)} />
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-sm font-medium text-ink truncate">{value}</p>
      <p className="text-[10px] text-ink-muted">{label}</p>
    </div>
  );
}

export function MyAffiliateLinks() {
  const smartBack = useSmartBack();
  const { data: relationships, isLoading } = useMyAffiliateRelationships();

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-xl mx-auto">
        <button onClick={smartBack} className="text-ink-muted mb-4">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-6">My affiliate links</h2>

        {isLoading ? (
          <p className="text-ink-muted text-sm">Loading…</p>
        ) : (relationships ?? []).length === 0 ? (
          <div className="flex flex-col items-center text-center gap-2 mt-16 text-ink-muted">
            <TrendingUp size={24} />
            <p className="text-sm">
              Projects you fork to earn a commission on will show up here — look for "Share & earn" on any project
              that has affiliate forking turned on.
            </p>
          </div>
        ) : (
          relationships!.map((r) => <AffiliateLinkRow key={r.id} relationship={r} />)
        )}
      </div>
    </div>
  );
}
