// src/pages/MyAffiliateLinks.tsx
import { isFileType } from "../lib/fileProject";
import { FileFolderIcon } from "../components/FileFolderArt";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft, GitFork, Copy, Check, ImageIcon, Share2, MousePointerClick, ShoppingBag, Clock, Banknote } from "lucide-react";
import {
  useMyAffiliateRelationships,
  useAffiliateDashboard,
  useAffiliateTotals,
  affiliateLinkFor,
  type AffiliateRelationshipWithProject,
} from "../hooks/useAffiliates";
import { useToast } from "../components/Toast";
import { formatUsd } from "../lib/money";
import { getEffectivePrice } from "../hooks/useProjects";
import { getProjectUrl } from "../lib/projectLinks";
import { APP_URL } from "../lib/appUrl";
import { BrandCard } from "../components/BrandCard";

export function AffiliateLinkRow({ relationship }: { relationship: AffiliateRelationshipWithProject }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const { data: dashboard } = useAffiliateDashboard(
    relationship.status === "active" ? relationship.id : undefined
  );

  async function handleCopy() {
    const baseUrl = relationship.project
      ? getProjectUrl(relationship.project)
      : `${APP_URL}/projects/${relationship.project_id}`;
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

  const revoked = relationship.status === "revoked";
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className={`bg-surface rounded-2xl border border-border p-4 mb-3 ${revoked ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-3">
        <Link
          to={`/projects/${relationship.project_id}`}
          className={`w-12 ${relationship.project.project_type === "book" ? "h-[72px]" : "h-12"} rounded-xl bg-canvas overflow-hidden flex items-center justify-center shrink-0`}
        >
          {isFileType(relationship.project.project_type) ? (
            <FileFolderIcon size={48} className="w-full h-full" />
          ) : relationship.project.thumbnail_url ? (
            <img src={relationship.project.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={18} className="text-ink-muted" />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/projects/${relationship.project_id}`} className="text-sm font-medium text-ink truncate block">
            {relationship.project.title}
          </Link>
          <p className="text-xs text-ink-muted">
            {formatUsd(getEffectivePrice(relationship.project))}
            {revoked ? " · Revoked" : ""}
          </p>
        </div>
      </div>

      {!revoked && (
        <>
          <div className="grid grid-cols-4 gap-2 mt-4 rounded-xl bg-canvas px-2 py-3">
            <MiniStat label="Clicks" value={String(dashboard?.clicks ?? 0)} />
            <MiniStat label="Sales" value={String(dashboard?.completed_sales ?? 0)} />
            <MiniStat label="Pending" value={formatUsd(dashboard?.pending_commission ?? 0)} />
            <MiniStat label="Paid" value={formatUsd(dashboard?.paid_commission ?? 0)} />
          </div>

          <button
            onClick={() => void handleCopy()}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-full bg-accent-soft text-accent text-sm font-medium py-2.5 transition-colors hover:bg-accent-soft/70"
          >
            {copied ? <Check size={16} /> : canShare ? <Share2 size={16} /> : <Copy size={16} />}
            {copied ? "Copied" : canShare ? "Share affiliate link" : "Copy affiliate link"}
          </button>
        </>
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

function SummaryStat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-white/90 flex items-center gap-1">
        <Icon size={11} aria-hidden="true" /> {label}
      </p>
      <p className="font-display text-xl text-white tabular-nums mt-0.5 truncate">{value}</p>
    </div>
  );
}

export function MyAffiliateLinks() {
  const smartBack = useSmartBack();
  const { data: relationships, isLoading } = useMyAffiliateRelationships();

  const visible = (relationships ?? []).filter((r) => !!r.project);
  const active = visible.filter((r) => r.status !== "revoked");
  const revoked = visible.filter((r) => r.status === "revoked");
  const totals = useAffiliateTotals(active.map((r) => r.id));

  return (
    <div className="min-h-screen bg-canvas px-4 md:px-8 pt-4 md:pt-10 pb-10">
      <div className="max-w-xl md:max-w-3xl mx-auto">
        <button onClick={smartBack} className="text-ink-muted mb-4" aria-label="Back">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-bold text-[1.75rem] leading-tight tracking-tight text-ink mb-1 flex items-center gap-2.5">
          <GitFork size={24} className="text-accent" />
          Forked projects
        </h2>
        <p className="text-sm text-ink-muted mb-5">Each fork has your affiliate link. Share it, earn on every sale.</p>

        {isLoading ? (
          <p className="text-ink-muted text-sm">Loading…</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-2 mt-16 text-ink-muted">
            <GitFork size={24} />
            <p className="text-sm">No forked projects yet. Tap "Fork & earn" on a project to start.</p>
          </div>
        ) : (
          <>
            {/* One bold card for the whole picture, same surface as the Wallet balance. */}
            <BrandCard className="p-5 mb-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white">Earned from referrals</p>
              <p className="font-display text-4xl text-white tabular-nums mt-2 mb-5">
                {totals.loading ? "…" : formatUsd(totals.paid + totals.pending)}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4 border-t border-white/15 pt-4">
                <SummaryStat icon={MousePointerClick} label="Clicks" value={String(totals.clicks)} />
                <SummaryStat icon={ShoppingBag} label="Sales" value={String(totals.sales)} />
                <SummaryStat icon={Clock} label="Pending" value={formatUsd(totals.pending)} />
                <SummaryStat icon={Banknote} label="Paid" value={formatUsd(totals.paid)} />
              </div>
            </BrandCard>

            {active.length > 0 && (
              <section className="mb-6">
                <h3 className="font-display text-lg text-ink mb-3">Active</h3>
                <div className="md:grid md:grid-cols-2 md:gap-x-3">
                  {active.map((r) => (
                    <AffiliateLinkRow key={r.id} relationship={r} />
                  ))}
                </div>
              </section>
            )}

            {revoked.length > 0 && (
              <section>
                <h3 className="font-display text-lg text-ink mb-3">Revoked</h3>
                <div className="md:grid md:grid-cols-2 md:gap-x-3">
                  {revoked.map((r) => (
                    <AffiliateLinkRow key={r.id} relationship={r} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
