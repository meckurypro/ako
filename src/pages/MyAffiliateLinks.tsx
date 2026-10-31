// src/pages/MyAffiliateLinks.tsx
//
// Forked projects.
//   • Header   — Library/Connect's orange icon + bold title (with a back arrow: this page lives under Wallet).
//   • Hero     — one premium summary card: total earned as the headline, pending/paid beneath it, and the
//                forks / clicks / sales / conversion strip. Brand-green gradient with soft glow, white type.
//   • Tabs     — Active / Revoked on the shared SlidingTabBar + SwipeableTabs carousel (swipe anywhere on the page).
//   • Cards    — ForkedProjectCard: cover + title + commission rate, a four-up stat grid, and a one-tap
//                Share/Copy action with the link preview. Connect keeps using the compact AffiliateLinkRow.
import { thumbBoxStyle } from "../lib/thumbnailSpec";
import { isFileType } from "../lib/fileProject";
import { FileFolderIcon } from "../components/FileFolderArt";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { useTabState } from "../hooks/useTabState";
import { ArrowLeft, GitFork, Copy, Check, ImageIcon, Share2, MousePointerClick, ShoppingBag, TrendingUp, Sparkles } from "lucide-react";
import {
  useMyAffiliateRelationships,
  useAffiliateDashboard,
  useAffiliateTotals,
  useCurrentCommissionPct,
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
            style={thumbBoxStyle(relationship.project, 48)}
            className="rounded-lg bg-canvas overflow-hidden flex items-center justify-center shrink-0"
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

// ---------------------------------------------------------------------------
// Hero summary
// ---------------------------------------------------------------------------

function HeroStat({ icon: Icon, label, value }: { icon: typeof GitFork; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/12 backdrop-blur-sm px-3 py-2.5 ring-1 ring-white/15">
      <Icon size={14} className="text-white/70 mb-1.5" />
      <span className="block text-lg font-semibold leading-none text-white tabular-nums truncate">{value}</span>
      <span className="block text-[11px] text-white/70 mt-1 truncate">{label}</span>
    </div>
  );
}

function AffiliateHero({
  forks,
  clicks,
  sales,
  pending,
  paid,
  loading,
}: {
  forks: number;
  clicks: number;
  sales: number;
  pending: number;
  paid: number;
  loading: boolean;
}) {
  const earned = pending + paid;
  const conversion = clicks > 0 ? Math.min(100, (sales / clicks) * 100) : 0;
  return (
    <section
      aria-label="Affiliate earnings summary"
      className="relative overflow-hidden rounded-3xl p-5 mb-6 text-white shadow-[0_18px_40px_-18px_rgba(var(--accent-rgb),0.65)]"
      style={{ background: "linear-gradient(145deg, var(--color-cta) 0%, var(--color-accent-hover) 100%)" }}
    >
      {/* soft light blooms — purely decorative */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full opacity-40"
        style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.55), transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-12 h-52 w-52 rounded-full opacity-30"
        style={{ background: "radial-gradient(closest-side, rgba(253,82,0,0.55), transparent)" }}
      />

      <div className="relative">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-white/75">
          <Sparkles size={13} />
          Total earned
        </p>
        <p className="mt-2 text-[2.5rem] leading-none font-semibold tracking-tight tabular-nums">
          {loading ? "…" : formatUsd(earned)}
        </p>
        <p className="mt-2 text-sm text-white/75 tabular-nums">
          {formatUsd(pending)} pending <span aria-hidden className="mx-1.5 text-white/40">•</span> {formatUsd(paid)} paid
        </p>

        <div className="mt-5 grid grid-cols-4 gap-2">
          <HeroStat icon={GitFork} label="Forks" value={String(forks)} />
          <HeroStat icon={MousePointerClick} label="Clicks" value={String(clicks)} />
          <HeroStat icon={ShoppingBag} label="Sales" value={String(sales)} />
          <HeroStat icon={TrendingUp} label="Convert" value={`${conversion >= 10 ? Math.round(conversion) : conversion.toFixed(1)}%`} />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Project card
// ---------------------------------------------------------------------------

function CardStat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0 text-center">
      <p className={`text-sm tabular-nums truncate ${strong ? "font-semibold text-accent" : "font-medium text-ink"}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-ink-muted mt-0.5">{label}</p>
    </div>
  );
}

function ForkedProjectCard({ relationship }: { relationship: AffiliateRelationshipWithProject }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const revoked = relationship.status === "revoked";
  const { data: dashboard } = useAffiliateDashboard(revoked ? undefined : relationship.id);
  const { data: commissionPct } = useCurrentCommissionPct(relationship.affiliate_program_id);

  const project = relationship.project;
  if (!project) return null;

  const baseUrl = getProjectUrl(project);
  const link = affiliateLinkFor(baseUrl, relationship.referral_token);
  const shortLink = link.replace(/^https?:\/\//, "");
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const sales = dashboard?.completed_sales ?? 0;
  const isBook = project.project_type === "book";

  async function handleShare() {
    try {
      if (canShare) {
        await navigator.share({ title: project!.title, url: link });
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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast("Link copied.", { variant: "success" });
    } catch {
      // Clipboard blocked — nothing to do.
    }
  }

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_0_rgba(var(--shadow-ink-rgb),0.03),0_10px_24px_-18px_rgba(var(--shadow-ink-rgb),0.35)] ${
        revoked ? "opacity-70" : ""
      }`}
    >
      <Link to={`/projects/${relationship.project_id}`} className="flex items-center gap-3.5 p-3.5">
        <div
          style={thumbBoxStyle(project, isBook ? 56 : 72)}
          className="rounded-xl bg-canvas overflow-hidden flex items-center justify-center shrink-0 ring-1 ring-border"
        >
          {isFileType(project.project_type) ? (
            <FileFolderIcon size={56} className="w-full h-full" />
          ) : project.thumbnail_url ? (
            <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={20} className="text-ink-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink leading-snug line-clamp-2">{project.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-ink-muted tabular-nums">{formatUsd(getEffectivePrice(project))}</span>
            {revoked ? (
              <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-muted ring-1 ring-border">
                Revoked
              </span>
            ) : commissionPct != null ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                <GitFork size={10} />
                {Math.round(commissionPct * 1000) / 10}% commission
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      {!revoked && (
        <>
          <div className="grid grid-cols-4 divide-x divide-border border-y border-border bg-canvas/50 py-2.5">
            <CardStat label="Clicks" value={String(dashboard?.clicks ?? 0)} />
            <CardStat label="Sales" value={String(sales)} />
            <CardStat label="Pending" value={formatUsd(dashboard?.pending_commission ?? 0)} />
            <CardStat label="Paid" value={formatUsd(dashboard?.paid_commission ?? 0)} strong />
          </div>

          <div className="flex items-center gap-2 p-3">
            <button
              type="button"
              onClick={() => void handleCopy()}
              aria-label="Copy affiliate link"
              className="min-w-0 flex-1 flex items-center gap-2 rounded-xl border border-border bg-canvas px-3 h-10 text-left"
            >
              {copied ? <Check size={14} className="text-accent shrink-0" /> : <Copy size={14} className="text-ink-muted shrink-0" />}
              <span className="truncate text-xs text-ink-muted">{copied ? "Copied" : shortLink}</span>
            </button>
            <button
              type="button"
              onClick={() => void handleShare()}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-cta px-4 h-10 text-sm font-semibold text-white transition-opacity active:opacity-85"
            >
              <Share2 size={14} />
              Share
            </button>
          </div>
        </>
      )}
    </article>
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
      <div className="flex flex-col gap-3.5 md:grid md:grid-cols-2 md:gap-4">
        {rows.map((r) => (
          <ForkedProjectCard key={r.id} relationship={r} />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 md:px-8 pt-4 md:pt-10 pb-28">
      <div className="max-w-xl md:max-w-4xl mx-auto">
        <button onClick={smartBack} className="text-ink-muted mb-4" aria-label="Back">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-bold text-[1.75rem] leading-tight tracking-tight text-ink mb-1 flex items-center gap-2.5">
          <GitFork size={24} className="text-brand-orange" />
          Forked
        </h2>
        <p className="text-sm text-ink-muted mb-6">Each fork has your affiliate link. Share it, earn on every sale.</p>

        {isLoading ? (
          <p className="text-ink-muted text-sm">Loading…</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-2 mt-16 text-ink-muted">
            <GitFork size={24} className="text-brand-orange" />
            <p className="text-sm">No forked projects yet. Tap "Fork & earn" on a project to start.</p>
          </div>
        ) : (
          <>
            <AffiliateHero
              forks={visible.length}
              clicks={totals.clicks}
              sales={totals.sales}
              pending={totals.pending}
              paid={totals.paid}
              loading={totals.loading}
            />

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
              fillViewport
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
