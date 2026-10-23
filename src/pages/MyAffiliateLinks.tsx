// src/pages/MyAffiliateLinks.tsx
//
// Forked projects. Built from the same parts as Library, Connect and the Profile so it reads as one family:
//   • Header   — Library/Connect's orange icon + bold title (with a back arrow: this page lives under Wallet).
//   • Summary  — the Profile's quiet stat row (number over muted label, no filled card). Lead with the projects;
//                earnings are one stat among four. The Wallet owns the money headline.
//   • Tabs     — Active / Revoked on the shared SlidingTabBar + SwipeableTabs carousel.
//   • Rows     — Library's thumbnail tile, with the share action in the trailing slot where Library puts "remove".
import { isFileType } from "../lib/fileProject";
import { FileFolderIcon } from "../components/FileFolderArt";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { useTabState } from "../hooks/useTabState";
import { ArrowLeft, GitFork, Copy, Check, ImageIcon, Share2 } from "lucide-react";
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
import { BottomNav } from "../components/BottomNav";
import { SwipeableTabs } from "../components/SwipeableTabs";
import { SlidingTabBar } from "../components/SlidingTabBar";

const TABS = ["active", "revoked"] as const;
type AffiliateTab = (typeof TABS)[number];

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
  const sales = dashboard?.completed_sales ?? 0;

  return (
    <div className={`rounded-xl border border-border bg-surface ${revoked ? "opacity-70" : ""}`}>
      <div className="relative">
        <Link to={`/projects/${relationship.project_id}`} className="flex items-center gap-3 p-3 pr-12">
          <div
            className={`w-12 ${relationship.project.project_type === "book" ? "h-[72px]" : "h-12"} rounded-lg bg-canvas overflow-hidden flex items-center justify-center shrink-0`}
          >
            {isFileType(relationship.project.project_type) ? (
              <FileFolderIcon size={48} className="w-full h-full" />
            ) : relationship.project.thumbnail_url ? (
              <img src={relationship.project.thumbnail_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon size={18} className="text-ink-muted" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink truncate">{relationship.project.title}</p>
            <p className="text-xs text-ink-muted flex items-center gap-1">
              <GitFork size={12} />
              {formatUsd(getEffectivePrice(relationship.project))}
              {revoked ? " · Revoked" : ` · ${sales} ${sales === 1 ? "sale" : "sales"}`}
            </p>
          </div>
        </Link>
        {!revoked && (
          <button
            type="button"
            onClick={() => void handleCopy()}
            aria-label={canShare ? "Share affiliate link" : "Copy affiliate link"}
            className="absolute top-1/2 -translate-y-1/2 right-2 p-2 rounded-full text-accent hover:bg-accent-soft transition-colors"
          >
            {copied ? <Check size={16} /> : canShare ? <Share2 size={16} /> : <Copy size={16} />}
          </button>
        )}
      </div>

      {!revoked && (
        <div className="grid grid-cols-4 gap-2 border-t border-border px-3 py-2.5">
          <MiniStat label="Clicks" value={String(dashboard?.clicks ?? 0)} />
          <MiniStat label="Sales" value={String(sales)} />
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
      <p className="text-sm font-medium text-ink truncate tabular-nums">{value}</p>
      <p className="text-[10px] text-ink-muted">{label}</p>
    </div>
  );
}

// Profile's stat idiom: a large semibold figure over a small muted label.
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block text-xl font-semibold leading-none text-ink tabular-nums truncate">{value}</span>
      <span className="block text-sm text-ink-muted mt-1.5">{label}</span>
    </div>
  );
}

export function MyAffiliateLinks() {
  const smartBack = useSmartBack();
  const { data: relationships, isLoading } = useMyAffiliateRelationships();
  const [tab, setTab] = useTabState<AffiliateTab>(TABS, "active");
  const activeIndex = Math.max(TABS.indexOf(tab), 0);
  const [tabProgress, setTabProgress] = useState(activeIndex);
  const [tabDragging, setTabDragging] = useState(false);

  const visible = (relationships ?? []).filter((r) => !!r.project);
  const active = visible.filter((r) => r.status !== "revoked");
  const revoked = visible.filter((r) => r.status === "revoked");
  const totals = useAffiliateTotals(active.map((r) => r.id));

  const tabLabel: Record<AffiliateTab, string> = {
    active: `Active${active.length ? ` · ${active.length}` : ""}`,
    revoked: `Revoked${revoked.length ? ` · ${revoked.length}` : ""}`,
  };

  function renderPane(t: AffiliateTab): ReactNode {
    const rows = t === "active" ? active : revoked;
    if (rows.length === 0) {
      return (
        <div className="flex flex-col items-center text-center gap-2 mt-16 text-ink-muted">
          <GitFork size={24} className="text-brand-orange" />
          <p className="text-sm">
            {t === "active" ? 'Projects you fork show up here. Tap "Fork & earn" on a project to start.' : "Nothing revoked."}
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-3">
        {rows.map((r) => (
          <AffiliateLinkRow key={r.id} relationship={r} />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 md:px-8 pt-4 md:pt-10 pb-24">
      <div className="max-w-xl md:max-w-4xl mx-auto">
        <button onClick={smartBack} className="text-ink-muted mb-4" aria-label="Back">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-bold text-[1.75rem] leading-tight tracking-tight text-ink mb-1 flex items-center gap-2.5">
          <GitFork size={24} className="text-brand-orange" />
          Forked
        </h2>
        <p className="text-sm text-ink-muted mb-5">Each fork has your affiliate link. Share it, earn on every sale.</p>

        {isLoading ? (
          <p className="text-ink-muted text-sm">Loading…</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-2 mt-16 text-ink-muted">
            <GitFork size={24} className="text-brand-orange" />
            <p className="text-sm">No forked projects yet. Tap "Fork & earn" on a project to start.</p>
          </div>
        ) : (
          <>
            {/* Projects first: how many you've forked and how they're doing. Earnings are one stat among four, the
                same weight as the rest; the Wallet owns the money headline. */}
            <div className="grid grid-cols-4 gap-4 mb-5 pb-5 border-b border-border">
              <Stat label="Forked" value={String(visible.length)} />
              <Stat label="Clicks" value={String(totals.clicks)} />
              <Stat label="Sales" value={String(totals.sales)} />
              <Stat label="Earned" value={totals.loading ? "…" : formatUsd(totals.paid + totals.pending)} />
            </div>

            <SlidingTabBar
              ariaLabel="Forked projects"
              tabs={TABS.map((t) => ({ id: t, label: tabLabel[t] }))}
              activeIndex={activeIndex}
              progress={tabProgress}
              dragging={tabDragging}
              onSelect={(i) => setTab(TABS[i])}
              className="mb-5"
            />

            <SwipeableTabs
              index={activeIndex}
              onIndexChange={(i) => setTab(TABS[i])}
              onProgress={(progress, dragging) => {
                setTabProgress(progress);
                setTabDragging(dragging);
              }}
            >
              {TABS.map((t) => (
                <div key={t}>{renderPane(t)}</div>
              ))}
            </SwipeableTabs>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
