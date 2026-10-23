// src/components/pageTemplate/PageTemplateLayout.tsx
// Draws a Page's cover, identity and landing sections according to the page's template
// (see lib/pageTemplates.ts). PagePage hands over ready-made pieces — the photo, the name,
// the action buttons, the hero slideshow — and this decides where each one goes, how big it is
// and how it is framed. It owns no data and no behaviour.
import { useState, type ReactNode } from "react";
import type { Page } from "../../types/database";
import type { PageTemplateConfig, SectionKey } from "../../lib/pageTemplates";
import type { ActionsMode } from "../../lib/pageTemplates";

const SHAPE = { circle: "rounded-full", squircle: "rounded-[28%]", square: "rounded-lg" } as const;
const BANNER_ASPECT = { standard: "aspect-[8/3]", tall: "aspect-[4/5] md:aspect-[4/3]", strip: "aspect-[5/1]" } as const;
const SECTION_GAP = { tight: "space-y-6", cozy: "space-y-9", airy: "space-y-12" } as const;
const SECTION_TOP = { tight: "mt-6", cozy: "mt-8", airy: "mt-10" } as const;

export function SectionHeading({
  id,
  cfg,
  n,
  children,
}: {
  id?: string;
  cfg: PageTemplateConfig;
  n?: number;
  children: ReactNode;
}) {
  const center = cfg.centered ? "text-center" : "";
  switch (cfg.headings) {
    case "eyebrow":
      return (
        <h2 id={id} className={`text-xs font-semibold uppercase tracking-[0.18em] text-accent ${center}`}>
          {children}
        </h2>
      );
    case "numbered":
      return (
        <h2 id={id} className="flex items-baseline gap-3">
          <span className="font-display text-sm tabular-nums text-ink-muted">{String(n ?? 1).padStart(2, "0")}</span>
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">{children}</span>
          <span aria-hidden className="h-px flex-1 self-center bg-border" />
        </h2>
      );
    case "rule":
      return (
        <h2
          id={id}
          className={`border-b border-border pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted ${center}`}
        >
          {children}
        </h2>
      );
    default:
      return (
        <h2 id={id} className={`font-display text-xl font-semibold tracking-tight text-ink ${center}`}>
          {children}
        </h2>
      );
  }
}

function About({ cfg, bio, n }: { cfg: PageTemplateConfig; bio: string; n: number }) {
  const [open, setOpen] = useState(false);
  const center = cfg.centered ? "text-center" : "";
  const body =
    cfg.about === "lead"
      ? `mt-3 whitespace-pre-wrap break-words font-display text-lg leading-relaxed text-ink first-letter:float-left first-letter:mr-2 first-letter:text-5xl first-letter:font-semibold first-letter:leading-[0.85] ${center}`
      : `mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink ${center}`;
  const long = cfg.about === "clamp" && bio.length > 140;
  return (
    <>
      <SectionHeading id="page-about-heading" cfg={cfg} n={n}>
        About
      </SectionHeading>
      <p className={`${body} ${long && !open ? "line-clamp-3" : ""}`}>{bio}</p>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 text-sm font-medium text-accent">
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </>
  );
}

export interface PageTemplateLayoutProps {
  page: Page;
  cfg: PageTemplateConfig;
  hasSlides: boolean;
  /** Image or gradient that fills the banner box. */
  bannerContent: ReactNode;
  onViewAvatar: () => void;
  /** The page name as a (possibly menu-opening) heading. Receives the text classes to use. */
  renderName: (className: string) => ReactNode;
  renderActions: (tone: "normal" | "overlay", layout: ActionsMode) => ReactNode;
  verified: ReactNode;
  handleLine: ReactNode;
  tagline: ReactNode;
  parentLine: ReactNode;
  followers: ReactNode;
  website: ReactNode;
  visitorNotice: ReactNode;
  /** The hero slideshow (already framed), or null. */
  hero: ReactNode;
  team: (heading: ReactNode) => ReactNode | null;
  subsidiaries: ReactNode | null;
}

export function PageTemplateLayout(p: PageTemplateLayoutProps) {
  const { cfg, page } = p;
  const hasCover = !!page.cover_url;
  const overlay = cfg.identity === "over-left" || cfg.identity === "over-center";
  const hasBanner = cfg.banner === "standard" || cfg.banner === "tall" || cfg.banner === "strip";
  const center = cfg.identity === "over-center" || cfg.identity === "stack-center" || cfg.identity === "masthead";

  // ── pieces ──
  const avatarBox = (px: number, ring: boolean) => {
    const cls = `${SHAPE[cfg.avatarShape]} object-cover ${ring ? "ring-4 ring-canvas" : ""}`;
    const inner = page.avatar_url ? (
      <img src={page.avatar_url} alt={page.name} style={{ width: px, height: px }} className={cls} />
    ) : (
      <span
        style={{ width: px, height: px, fontSize: px * 0.34 }}
        className={`flex items-center justify-center bg-accent-soft font-medium text-accent ${cls}`}
      >
        {page.name
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()}
      </span>
    );
    return page.avatar_url ? (
      <button type="button" onClick={p.onViewAvatar} aria-label="View page photo" className="relative block shrink-0 bg-canvas">
        {inner}
      </button>
    ) : (
      <span className="relative block shrink-0 bg-canvas">{inner}</span>
    );
  };

  const nameCls = (size: string) =>
    `font-display font-semibold leading-tight break-words ${size} ${cfg.uppercaseName ? "uppercase tracking-[0.06em]" : "tracking-tight"}`;

  const statsBlock = (tone: "normal" | "overlay", align: string) => {
    if (cfg.stats === "none") return null;
    if (cfg.stats === "tiles") {
      return (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-border bg-surface px-4 py-3">{p.followers}</div>
          {p.website ? <div className="min-w-0 rounded-2xl border border-border bg-surface px-4 py-3">{p.website}</div> : null}
        </div>
      );
    }
    return (
      <div
        className={`mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 ${align} ${tone === "overlay" ? "text-white [&_*]:!text-white/90" : ""}`}
      >
        {p.followers}
        {p.website}
      </div>
    );
  };

  // ── banner / cover ──
  let top: ReactNode = null;
  if (hasBanner) {
    top = (
      <div className={`relative w-full overflow-hidden bg-accent-soft md:rounded-b-3xl ${BANNER_ASPECT[cfg.banner as "standard" | "tall" | "strip"]}`}>
        {overlay && !hasCover ? (
          <div
            aria-hidden
            className="h-full w-full"
            style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--color-accent) 75%, black), #0b0b0c)" }}
          />
        ) : (
          p.bannerContent
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />
        {overlay && (
          <div
            className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-4 pb-5 pt-28 text-white ${
              center ? "text-center" : ""
            }`}
          >
            <div className={`flex ${center ? "flex-col items-center" : "items-end gap-3"}`}>
              {avatarBox(cfg.avatarSize, false)}
              <div className={`min-w-0 ${center ? "mt-3" : "pb-0.5"}`}>
                {p.renderName(`${nameCls(center ? "text-4xl sm:text-5xl" : "text-[1.75rem]")} text-white`)}
                <div className={`mt-1 flex flex-wrap items-center gap-x-2 text-sm text-white/80 ${center ? "justify-center" : ""}`}>
                  {p.verified}
                  {p.handleLine}
                </div>
              </div>
            </div>
            {p.tagline && <div className="mt-2 text-base leading-snug text-white/90">{p.tagline}</div>}
            {statsBlock("overlay", center ? "justify-center" : "")}
            <div className={`mt-4 flex ${center ? "justify-center" : ""}`}>{p.renderActions("overlay", cfg.actions)}</div>
          </div>
        )}
      </div>
    );
  } else if (cfg.banner === "backdrop") {
    top = (
      <div aria-hidden className="absolute inset-x-0 top-0 h-80 overflow-hidden">
        {hasCover ? (
          <img src={page.cover_url!} alt="" className="h-full w-full scale-125 object-cover opacity-50 blur-2xl" />
        ) : (
          <div className="h-full w-full bg-accent-soft" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-canvas/60 to-canvas" />
      </div>
    );
  }

  // ── identity block (when it isn't drawn over the banner) ──
  let identity: ReactNode = null;
  if (!overlay) {
    const meta = (align: string) => (
      <>
        {p.verified && <div className={`mt-1 ${align}`}>{p.verified}</div>}
        <p className={`mt-1 text-sm text-ink-muted ${align}`}>{p.handleLine}</p>
        {p.tagline && <div className={`mt-2 text-base leading-snug text-ink ${align}`}>{p.tagline}</div>}
        {p.parentLine}
      </>
    );

    if (cfg.identity === "overlap-left") {
      identity = (
        <div className="px-4">
          <div className="-mt-12 flex items-end justify-between gap-3">
            <span className="relative block">{avatarBox(cfg.avatarSize, true)}</span>
            {cfg.actions === "side" && <div className="pb-1">{p.renderActions("normal", "side")}</div>}
          </div>
          <div className="mt-3 relative">{p.renderName(nameCls("text-[1.75rem]"))}</div>
          {meta("")}
          {cfg.actions !== "side" && <div className="mt-4">{p.renderActions("normal", cfg.actions)}</div>}
          {statsBlock("normal", "")}
        </div>
      );
    } else if (cfg.identity === "inline") {
      const compact = cfg.avatarSize <= 56;
      identity = (
        <div className={`px-4 ${cfg.banner === "strip" ? "" : "pt-4"}`}>
          <div className="flex items-start gap-4">
            <span className={`relative block ${cfg.banner === "strip" ? "-mt-9" : ""}`}>
              {avatarBox(cfg.avatarSize, cfg.banner === "strip")}
            </span>
            <div className={`min-w-0 flex-1 ${cfg.banner === "strip" ? "pt-2" : ""}`}>
              {p.renderName(nameCls(compact ? "text-xl" : "text-2xl"))}
              {p.verified && <div className="mt-0.5">{p.verified}</div>}
              <p className="mt-0.5 text-sm text-ink-muted">{p.handleLine}</p>
            </div>
            {cfg.actions === "row" && compact && <div className="shrink-0">{p.renderActions("normal", "row")}</div>}
          </div>
          {p.tagline && <div className="mt-3 text-base leading-snug text-ink">{p.tagline}</div>}
          {p.parentLine}
          {statsBlock("normal", "")}
          {!(cfg.actions === "row" && compact) && <div className="mt-4">{p.renderActions("normal", cfg.actions)}</div>}
        </div>
      );
    } else if (cfg.identity === "stack-center") {
      identity = (
        <div className="relative px-4 pt-6 text-center">
          <div className="flex justify-center">{avatarBox(cfg.avatarSize, true)}</div>
          <div className="mt-4">{p.renderName(nameCls("text-3xl"))}</div>
          {meta("")}
          {statsBlock("normal", "justify-center")}
          <div className="mt-5">{p.renderActions("normal", cfg.actions)}</div>
        </div>
      );
    } else {
      // masthead
      identity = (
        <div className="px-4 pt-3">
          <div className="border-y-2 border-ink py-6 text-center">
            <div className="flex justify-center">{avatarBox(cfg.avatarSize, false)}</div>
            <div className="mt-4">{p.renderName(nameCls("text-4xl"))}</div>
            {p.verified && <div className="mt-1">{p.verified}</div>}
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.22em] text-ink-muted">{p.handleLine}</p>
            {p.tagline && <div className="mt-3 font-display text-lg italic leading-snug text-ink">{p.tagline}</div>}
            {p.parentLine}
          </div>
          {statsBlock("normal", "justify-center")}
          <div className="mt-4 flex justify-center">{p.renderActions("normal", cfg.actions)}</div>
        </div>
      );
    }
  }

  // ── landing sections ──
  const panel = (key: string, node: ReactNode) =>
    cfg.panels ? (
      <div key={key} className="rounded-3xl border border-border bg-surface p-4">
        {node}
      </div>
    ) : (
      <div key={key}>{node}</div>
    );

  let n = 0;
  const sectionNodes: ReactNode[] = [];
  for (const key of cfg.order as SectionKey[]) {
    if (key === "about" && page.bio) {
      n += 1;
      sectionNodes.push(panel("about", <About cfg={cfg} bio={page.bio} n={n} />));
    } else if (key === "team") {
      const idx = n + 1;
      const node = p.team(
        <SectionHeading id="page-team-heading" cfg={cfg} n={idx}>
          Meet the team
        </SectionHeading>
      );
      if (node) {
        n += 1;
        sectionNodes.push(panel("team", node));
      }
    } else if (key === "subs" && p.subsidiaries) {
      n += 1;
      sectionNodes.push(
        panel(
          "subs",
          <>
            <SectionHeading id="page-subs-heading" cfg={cfg} n={n}>
              Subsidiaries
            </SectionHeading>
            {p.subsidiaries}
          </>
        )
      );
    }
  }

  const heroBlock = p.hero ? (
    cfg.heroFrame === "bleed" ? <div className="-mx-4">{p.hero}</div> : p.hero
  ) : null;

  return (
    <div className="relative">
      {cfg.heroFirst && p.hero ? (
        <div className="relative">
          {p.hero}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />
        </div>
      ) : null}
      {!hasBanner && !cfg.heroFirst && <div className="h-14" aria-hidden />}
      {top}
      <div className="relative">{identity}</div>
      <div className={`${SECTION_TOP[cfg.density]} ${SECTION_GAP[cfg.density]} px-4`}>
        {p.visitorNotice}
        {!cfg.heroFirst && heroBlock}
        {sectionNodes}
      </div>
    </div>
  );
}
