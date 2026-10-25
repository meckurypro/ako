// src/components/customPage/CustomPageRenderer.tsx
//
// Renders a Custom Page config. Pure presentation: no data fetching, no routing decisions. The public route
// (pages/CustomPageView.tsx) and the editor's live preview both use it, so what a person previews is what visitors get.
//
// Three decisions are kept apart on purpose:
//   • style     — the visual language (minimalist / glass / elegant / midnight / aurora / bold / soft / neo): surfaces, type, corners, micro-interactions.
//   • template  — the arrangement of sections (showcase / stacked / brochure / spotlight / linkcard / split / portfolio).
//   • animation — how sections arrive (a preset, applied uniformly; never per element).
// Add a style by extending styleTokens(); add a template by adding an entry to LAYOUTS. Neither touches the database —
// design values are just short slugs in the config.
import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Download, FileText, Mail, MapPin, MessageCircle, Phone, ExternalLink, X } from "lucide-react";
import {
  publicFileUrl,
  resolveDesign,
  resolvePalette,
  withAlpha,
  type AnimationId,
  type CustomPageConfig,
  type CustomPageCta,
  type StyleId,
  type TemplateId,
} from "../../lib/customPage";
import { Reveal } from "./Reveal";
import { HeroSlides } from "./HeroSlides";

type Palette = ReturnType<typeof resolvePalette>;

export interface CustomPageActions {
  /** A button was tapped. Analytics hook — never required to navigate. */
  onCta?: (cta: CustomPageCta) => void;
  onOpenInquiry?: () => void;
  onMessageOwner?: () => void;
  onDocumentRead?: () => void;
  onDocumentDownload?: () => void;
  /** "Create your own custom page" footer link. */
  onCreateYours?: () => void;
}

interface Props {
  config: CustomPageConfig;
  /** Editor preview: links are inert and the footer link doesn't navigate. */
  preview?: boolean;
  actions?: CustomPageActions;
  /** Used for the footer link's referral attribution. */
  slug?: string;
}

// ── Style tokens ────────────────────────────────────────────────────────────────────────────────────────────
interface Tokens {
  pageStyle: CSSProperties;
  text: string;
  muted: string;
  heading: string;
  card: CSSProperties;
  radius: number;
  primaryBtn: CSSProperties;
  secondaryBtn: CSSProperties;
  rule: string;
  headingWeight?: number;
  headingTracking?: string;
  headingCase?: "uppercase";
  /** Button corner radius override (px). */
  btnRadius?: number;
  /** Micro-interaction family for buttons. */
  fx: "lift" | "shine" | "glow" | "hard";
  /** Fraction of the logo size used as its corner radius (0.5 = circle). */
  logoRound?: number;
  float?: boolean;
  drift?: boolean;
  glow?: string;
  ink?: string;
}

const CP_CSS = `
.cp-root .cp-btn{transition:transform .28s cubic-bezier(.2,.8,.2,1),box-shadow .28s ease,filter .28s ease;will-change:transform}
.cp-root .cp-btn:active{transform:scale(.965)}
.cp-root .cp-card{transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s ease}
.cp-root .cp-img img{transition:transform .8s cubic-bezier(.2,.8,.2,1)}
@media (hover:hover){
.cp-root .cp-btn:hover{transform:translateY(-2px)}
.cp-root .cp-glow:hover{filter:brightness(1.06) saturate(1.1);box-shadow:0 18px 40px -12px var(--cp-glow)!important}
.cp-root .cp-hard:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--cp-ink)!important}
.cp-root .cp-hard:active{transform:translate(3px,3px);box-shadow:1px 1px 0 var(--cp-ink)!important}
.cp-root .cp-card:hover{transform:translateY(-3px)}
.cp-root .cp-img:hover img{transform:scale(1.07)}
}
.cp-root .cp-shine{position:relative;overflow:hidden;isolation:isolate}
.cp-root .cp-shine::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.5),transparent);transform:skewX(-20deg);animation:cp-shine 5.5s ease-in-out infinite;z-index:-1;pointer-events:none}
.cp-root .cp-shine:hover::after{animation-duration:1.1s}
.cp-root .cp-float{animation:cp-float 5.5s ease-in-out infinite}
.cp-root.cp-drift{animation:cp-drift 22s ease-in-out infinite alternate}
@keyframes cp-shine{0%,55%{left:-60%}100%{left:140%}}
@keyframes cp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes cp-drift{0%{background-position:0% 0%}100%{background-position:100% 100%}}
@media (prefers-reduced-motion:reduce){.cp-root,.cp-root *,.cp-root *::after{animation:none!important;transition:none!important}}
`;

function styleTokens(style: StyleId, p: Palette): Tokens {
  const serif = '"Fraunces", Georgia, serif';
  const sans = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';
  if (style === "glass") {
    const light = p.onPrimary === "#FFFFFF";
    const tint = light ? "255,255,255" : "0,0,0";
    return {
      pageStyle: {
        background: `radial-gradient(120% 80% at 12% 0%, ${withAlpha(p.accent, 0.55)} 0%, transparent 55%), radial-gradient(100% 70% at 100% 100%, ${withAlpha(p.accent, 0.35)} 0%, transparent 60%), ${p.primary}`,
        color: p.onPrimary,
        fontFamily: sans,
      },
      text: p.onPrimary,
      muted: withAlpha(light ? "#FFFFFF" : "#000000", 0.72),
      heading: sans,
      card: {
        background: `rgba(${tint},0.13)`,
        border: `1px solid rgba(${tint},0.28)`,
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
      },
      radius: 24,
      primaryBtn: { background: p.accent, color: p.onAccent, border: `1px solid ${p.accent}` },
      secondaryBtn: {
        background: `rgba(${tint},0.14)`,
        color: p.onPrimary,
        border: `1px solid rgba(${tint},0.34)`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      },
      rule: `rgba(${tint},0.28)`,
      fx: "shine",
    };
  }
  if (style === "midnight") {
    return {
      pageStyle: {
        background: `radial-gradient(80% 50% at 50% -10%, ${withAlpha(p.accent, 0.34)}, transparent 70%), radial-gradient(60% 40% at 100% 62%, ${withAlpha(p.primary, 0.4)}, transparent 70%), #0B0B10`,
        color: "#F5F5F7",
        fontFamily: sans,
      },
      text: "#F5F5F7",
      muted: "rgba(245,245,247,0.64)",
      heading: sans,
      headingWeight: 700,
      headingTracking: "-0.03em",
      card: {
        background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 60px -30px rgba(0,0,0,0.85)",
      },
      radius: 22,
      primaryBtn: { background: `linear-gradient(135deg, ${p.accent}, ${withAlpha(p.accent, 0.78)})`, color: p.onAccent, border: "1px solid transparent", boxShadow: `0 10px 34px -8px ${withAlpha(p.accent, 0.65)}` },
      secondaryBtn: { background: "rgba(255,255,255,0.06)", color: "#F5F5F7", border: "1px solid rgba(255,255,255,0.16)" },
      rule: "rgba(255,255,255,0.12)",
      btnRadius: 999,
      fx: "shine",
      float: true,
      glow: withAlpha(p.accent, 0.7),
    };
  }
  if (style === "aurora") {
    return {
      pageStyle: {
        background: `radial-gradient(55% 45% at 15% 8%, ${withAlpha(p.accent, 0.85)}, transparent 70%), radial-gradient(50% 40% at 95% 25%, ${withAlpha(p.secondary, 0.55)}, transparent 70%), radial-gradient(60% 50% at 50% 100%, ${withAlpha(p.accent, 0.55)}, transparent 70%), ${p.primary}`,
        backgroundSize: "150% 150%",
        color: p.onPrimary,
        fontFamily: sans,
      },
      text: p.onPrimary,
      muted: withAlpha(p.onPrimary === "#FFFFFF" ? "#FFFFFF" : "#000000", 0.78),
      heading: sans,
      headingWeight: 800,
      headingTracking: "-0.035em",
      card: {
        background: p.onPrimary === "#FFFFFF" ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.4)",
        border: "1px solid rgba(255,255,255,0.32)",
        backdropFilter: "blur(22px) saturate(1.4)",
        WebkitBackdropFilter: "blur(22px) saturate(1.4)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 20px 50px -20px rgba(0,0,0,0.25)",
      },
      radius: 28,
      primaryBtn: { background: "#FFFFFF", color: "#14120F", border: "1px solid #FFFFFF", boxShadow: "0 12px 30px -10px rgba(0,0,0,0.35)" },
      secondaryBtn: { background: "rgba(255,255,255,0.16)", color: p.onPrimary, border: "1px solid rgba(255,255,255,0.38)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" },
      rule: "rgba(255,255,255,0.3)",
      btnRadius: 999,
      fx: "shine",
      logoRound: 0.32,
      float: true,
      drift: true,
    };
  }
  if (style === "neo") {
    const ink = p.onSecondary === "#FFFFFF" ? "#FFFFFF" : "#14120F";
    const edge = `2px solid ${ink}`;
    return {
      pageStyle: { background: p.secondary, color: p.onSecondary, fontFamily: '"Space Grotesk", "Inter", -apple-system, sans-serif' },
      text: p.onSecondary,
      muted: withAlpha(ink, 0.7),
      heading: '"Space Grotesk", "Inter", -apple-system, sans-serif',
      headingWeight: 800,
      headingTracking: "-0.02em",
      card: { background: "transparent", border: edge, boxShadow: `6px 6px 0 ${ink}` },
      radius: 12,
      primaryBtn: { background: p.accent, color: p.onAccent, border: edge, boxShadow: `4px 4px 0 ${ink}` },
      secondaryBtn: { background: p.secondary, color: p.onSecondary, border: edge, boxShadow: `4px 4px 0 ${ink}` },
      rule: ink,
      btnRadius: 10,
      fx: "hard",
      logoRound: 0.12,
      ink,
    };
  }

  const muted = withAlpha(p.onSecondary === "#FFFFFF" ? "#FFFFFF" : "#000000", 0.62);
  const rule = withAlpha(p.onSecondary === "#FFFFFF" ? "#FFFFFF" : "#000000", 0.14);
  if (style === "elegant") {
    return {
      pageStyle: { background: p.secondary, color: p.onSecondary, fontFamily: '"Newsreader", Georgia, serif' },
      text: p.onSecondary,
      muted,
      heading: serif,
      card: { background: "transparent", border: `1px solid ${p.accent}`, outline: `1px solid ${rule}`, outlineOffset: 4 },
      radius: 2,
      primaryBtn: { background: p.primary, color: p.onPrimary, border: `1px solid ${p.primary}`, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 13 },
      secondaryBtn: { background: "transparent", color: p.onSecondary, border: `1px solid ${p.onSecondary}`, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 13 },
      rule: p.accent,
      fx: "lift",
      logoRound: 0.05,
    };
  }
  if (style === "bold") {
    return {
      pageStyle: { background: p.secondary, color: p.onSecondary, fontFamily: sans },
      text: p.onSecondary,
      muted,
      heading: sans,
      headingWeight: 900,
      headingTracking: "-0.05em",
      card: { background: withAlpha(p.primary, 0.09), border: `2px solid ${p.primary}` },
      radius: 32,
      primaryBtn: { background: p.primary, color: p.onPrimary, border: `2px solid ${p.primary}`, boxShadow: `0 14px 0 -8px ${withAlpha(p.primary, 0.3)}` },
      secondaryBtn: { background: "transparent", color: p.onSecondary, border: `2px solid ${p.primary}` },
      rule: p.primary,
      btnRadius: 999,
      fx: "lift",
      logoRound: 0.5,
    };
  }
  if (style === "soft") {
    const darkBg = p.onSecondary === "#FFFFFF";
    return {
      pageStyle: { background: `radial-gradient(90% 38% at 50% 0%, ${withAlpha(p.accent, 0.18)}, transparent 70%), ${p.secondary}`, color: p.onSecondary, fontFamily: sans },
      text: p.onSecondary,
      muted,
      heading: sans,
      headingWeight: 700,
      headingTracking: "-0.025em",
      card: {
        background: darkBg ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.74)",
        border: darkBg ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.95)",
        boxShadow: darkBg ? "0 24px 60px -28px rgba(0,0,0,0.6)" : "0 24px 60px -28px rgba(20,20,40,0.22), 0 2px 6px rgba(20,20,40,0.04)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      },
      radius: 30,
      primaryBtn: { background: `linear-gradient(135deg, ${p.primary}, ${withAlpha(p.primary, 0.84)})`, color: p.onPrimary, border: "1px solid transparent", boxShadow: `0 14px 30px -12px ${withAlpha(p.primary, 0.7)}` },
      secondaryBtn: { background: darkBg ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.85)", color: p.onSecondary, border: `1px solid ${rule}`, boxShadow: darkBg ? "none" : "0 8px 22px -14px rgba(20,20,40,0.3)" },
      rule,
      btnRadius: 999,
      fx: "glow",
      logoRound: 0.34,
      float: true,
      glow: withAlpha(p.primary, 0.7),
    };
  }
  // minimalist
  return {
    pageStyle: { background: p.secondary, color: p.onSecondary, fontFamily: sans },
    text: p.onSecondary,
    muted,
    heading: sans,
    card: { background: withAlpha(p.onSecondary === "#FFFFFF" ? "#FFFFFF" : "#000000", 0.035), border: `1px solid ${rule}` },
    radius: 14,
    primaryBtn: { background: p.primary, color: p.onPrimary, border: `1px solid ${p.primary}` },
    secondaryBtn: { background: "transparent", color: p.onSecondary, border: `1px solid ${rule}` },
    rule,
    fx: "lift",
  };
}

// ── Pieces ──────────────────────────────────────────────────────────────────────────────────────────────────
interface Ctx {
  config: CustomPageConfig;
  p: Palette;
  t: Tokens;
  style: StyleId;
  animation: AnimationId;
  preview: boolean;
  actions: CustomPageActions;
}

const btnRadius = (t: Tokens) => t.btnRadius ?? (t.radius > 20 ? 999 : Math.min(t.radius, 12));
const hStyle = (ctx: { t: Tokens }): CSSProperties => ({
  fontFamily: ctx.t.heading,
  fontWeight: ctx.t.headingWeight ?? 700,
  letterSpacing: ctx.t.headingTracking,
  textTransform: ctx.t.headingCase,
});

function ctaHref(cta: CustomPageCta, config: CustomPageConfig): string | null {
  switch (cta.action) {
    case "url":
    case "ako":
      return cta.url ?? null;
    case "email":
      return config.contact?.email ? `mailto:${config.contact.email}` : null;
    case "call":
      return config.contact?.phone ? `tel:${config.contact.phone.replace(/[^\d+]/g, "")}` : null;
    case "download":
      return publicFileUrl(cta.file_path, { download: cta.file_name || "download" });
    default:
      return null;
  }
}

function CtaButton({ cta, primary, ctx, block }: { cta: CustomPageCta; primary: boolean; ctx: Ctx; block?: boolean }) {
  const { t, config, preview, actions } = ctx;
  const style: CSSProperties = {
    ...(primary ? t.primaryBtn : t.secondaryBtn),
    borderRadius: btnRadius(t),
  };
  const cls = `cp-btn cp-${t.fx} inline-flex items-center justify-center gap-2 px-6 py-3.5 text-[15px] font-semibold ${block ? "w-full" : ""}`;
  const icon =
    cta.action === "download" ? <Download size={17} /> : cta.action === "email" ? <Mail size={17} /> : cta.action === "call" ? <Phone size={17} /> : cta.action === "message" || cta.action === "inquiry" ? <MessageCircle size={17} /> : cta.action === "url" ? <ExternalLink size={16} /> : null;

  const click = (e: React.MouseEvent) => {
    if (preview) {
      e.preventDefault();
      return;
    }
    actions.onCta?.(cta);
    if (cta.action === "inquiry") {
      e.preventDefault();
      actions.onOpenInquiry?.();
    } else if (cta.action === "message") {
      e.preventDefault();
      actions.onMessageOwner?.();
    }
  };

  const href = ctaHref(cta, config);
  if (cta.action === "inquiry" || cta.action === "message" || !href) {
    return (
      <button type="button" onClick={click} className={cls} style={style}>
        {icon}
        {cta.label}
      </button>
    );
  }
  if (cta.action === "ako") {
    return (
      <Link to={href} onClick={click} className={cls} style={style}>
        {cta.label}
      </Link>
    );
  }
  const external = cta.action === "url";
  return (
    <a
      href={href}
      onClick={click}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...(cta.action === "download" ? { download: cta.file_name || "" } : {})}
      className={cls}
      style={style}
    >
      {icon}
      {cta.label}
    </a>
  );
}

function CtaGroup({ ctx, block, left }: { ctx: Ctx; block?: boolean; left?: boolean }) {
  // A draft can hold a button that has no label yet — never draw an empty pill for it.
  const ctas = (ctx.config.ctas ?? []).filter((c) => c.label.trim());
  if (!ctas.length) return null;
  return (
    <div className={`flex flex-wrap gap-3 ${block ? "flex-col" : left ? "justify-start" : "justify-center"}`}>
      {ctas.map((c, i) => (
        <CtaButton key={c.id} cta={c} primary={i === 0} ctx={ctx} block={block} />
      ))}
    </div>
  );
}

function Heading({ ctx, children, small }: { ctx: Ctx; children: ReactNode; small?: boolean }) {
  return (
    <h2
      className={`${small ? "text-xl" : "text-3xl sm:text-4xl"} font-bold leading-tight tracking-tight`}
      style={{ ...hStyle(ctx), color: ctx.t.text }}
    >
      {children}
    </h2>
  );
}

function Logo({ ctx, size = 64, ring }: { ctx: Ctx; size?: number; ring?: boolean }) {
  const url = publicFileUrl(ctx.config.identity?.icon_path);
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className={`object-cover ${ctx.t.float ? "cp-float" : ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * (ring ? 0.5 : ctx.t.logoRound ?? 0.25),
        ...(ring ? { boxShadow: `0 0 0 4px ${withAlpha(ctx.p.accent, 0.4)}, 0 14px 34px -12px ${withAlpha(ctx.p.accent, 0.6)}` } : null),
      }}
    />
  );
}

function Intro({ ctx, left }: { ctx: Ctx; left?: boolean }) {
  const intro = ctx.config.identity?.intro?.trim();
  if (!intro) return null;
  return (
    <p className={`text-[17px] leading-relaxed whitespace-pre-line max-w-2xl ${left ? "text-left" : "text-center mx-auto"}`} style={{ color: ctx.t.text }}>
      {intro}
    </p>
  );
}

function DocumentCard({ ctx }: { ctx: Ctx }) {
  const doc = ctx.config.document;
  if (!doc?.path) return null;
  const view = publicFileUrl(doc.path);
  const dl = publicFileUrl(doc.path, { download: doc.file_name || `${doc.title || "document"}.pdf` });
  const block = (e: React.MouseEvent) => ctx.preview && e.preventDefault();
  return (
    <div className="cp-card p-6 sm:p-8 text-center" style={{ ...ctx.t.card, borderRadius: ctx.t.radius }}>
      <FileText size={34} className="mx-auto mb-3" style={{ color: ctx.t.text, opacity: 0.85 }} />
      <h3 className="text-xl font-semibold mb-1" style={hStyle(ctx)}>
        {doc.title || "Read the document"}
      </h3>
      <p className="text-sm mb-5" style={{ color: ctx.t.muted }}>
        Open it right here in your browser, or save a copy.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <a
          href={view ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            block(e);
            if (!ctx.preview) ctx.actions.onDocumentRead?.();
          }}
          className={`cp-btn cp-${ctx.t.fx} inline-flex items-center gap-2 px-6 py-3.5 text-[15px] font-semibold`}
          style={{ ...ctx.t.primaryBtn, borderRadius: btnRadius(ctx.t) }}
        >
          <FileText size={17} /> Read online
        </a>
        <a
          href={dl ?? "#"}
          download={doc.file_name || ""}
          onClick={(e) => {
            block(e);
            if (!ctx.preview) ctx.actions.onDocumentDownload?.();
          }}
          className={`cp-btn cp-${ctx.t.fx} inline-flex items-center gap-2 px-6 py-3.5 text-[15px] font-semibold`}
          style={{ ...ctx.t.secondaryBtn, borderRadius: btnRadius(ctx.t) }}
        >
          <Download size={17} /> Download
        </a>
      </div>
    </div>
  );
}

type GalleryVariant = "grid" | "small" | "big" | "bento";

const BENTO = ["col-span-2 row-span-2", "", "", "row-span-2", "", "col-span-2"];

function Gallery({ ctx, variant = "grid", items: override }: { ctx: Ctx; variant?: GalleryVariant; items?: { path: string; caption?: string }[] }) {
  const items = override ?? ctx.config.gallery ?? [];
  const [open, setOpen] = useState<number | null>(null);
  if (!items.length) return null;
  const wrap =
    variant === "small"
      ? "grid grid-cols-3 sm:grid-cols-4 gap-2"
      : variant === "big"
        ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
        : variant === "bento"
          ? "grid grid-cols-2 sm:grid-cols-4 auto-rows-[150px] sm:auto-rows-[190px] gap-3 [grid-auto-flow:dense]"
          : "grid grid-cols-2 sm:grid-cols-3 gap-2.5";
  const radius = variant === "small" ? Math.min(ctx.t.radius, 12) : variant === "grid" ? Math.min(ctx.t.radius, 16) : Math.min(ctx.t.radius + 4, 32);
  const cell = (i: number) =>
    variant === "bento" ? `${BENTO[i % BENTO.length]} h-full` : variant === "big" ? "aspect-[4/5]" : "aspect-square";
  return (
    <>
      <div className={wrap}>
        {items.map((g, i) => (
          <Reveal key={g.path} animation={ctx.animation} index={i % 6} className={variant === "bento" ? BENTO[i % BENTO.length] : ""}>
            <button
              type="button"
              onClick={() => !ctx.preview && setOpen(i)}
              className={`cp-img block w-full overflow-hidden ${variant === "bento" ? "h-full" : cell(i)}`}
              style={{ borderRadius: radius, ...(ctx.style === "neo" ? { border: `2px solid ${ctx.t.ink}`, boxShadow: `4px 4px 0 ${ctx.t.ink}` } : null) }}
              aria-label={g.caption || `Open photo ${i + 1}`}
            >
              <img src={publicFileUrl(g.path) ?? ""} alt={g.caption ?? ""} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </button>
          </Reveal>
        ))}
      </div>
      {open !== null && items[open] && (
        <div className="fixed inset-0 z-[80] bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setOpen(null)} role="dialog" aria-modal="true">
          <button type="button" aria-label="Close" className="absolute top-4 right-4 text-white p-2" onClick={() => setOpen(null)}>
            <X size={26} />
          </button>
          <img src={publicFileUrl(items[open].path) ?? ""} alt={items[open].caption ?? ""} className="max-h-[80vh] max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
          {items[open].caption && <p className="text-white/85 text-sm mt-3 text-center max-w-md">{items[open].caption}</p>}
        </div>
      )}
    </>
  );
}

function Contact({ ctx }: { ctx: Ctx }) {
  const c = ctx.config.contact ?? {};
  const inquiry = ctx.config.engagement?.inquiry !== false;
  if (!c.email && !c.phone && !c.address && !inquiry) return null;
  const row = (icon: ReactNode, label: string, href?: string) => {
    const body = (
      <span className="flex items-center gap-3 text-[15px]">
        <span className="shrink-0 opacity-80">{icon}</span>
        <span className="break-words min-w-0 text-left">{label}</span>
      </span>
    );
    return href ? (
      <a href={href} onClick={(e) => ctx.preview && e.preventDefault()} className="block py-1.5">
        {body}
      </a>
    ) : (
      <div className="py-1.5">{body}</div>
    );
  };
  return (
    <div className="cp-card p-6 sm:p-8" style={{ ...ctx.t.card, borderRadius: ctx.t.radius }}>
      <Heading ctx={ctx} small>
        Get in touch
      </Heading>
      <div className="mt-3">
        {c.email && row(<Mail size={18} />, c.email, `mailto:${c.email}`)}
        {c.phone && row(<Phone size={18} />, c.phone, `tel:${c.phone.replace(/[^\d+]/g, "")}`)}
        {c.address && row(<MapPin size={18} />, c.address, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`)}
      </div>
      {inquiry && (
        <button
          type="button"
          onClick={() => !ctx.preview && ctx.actions.onOpenInquiry?.()}
          className={`cp-btn cp-${ctx.t.fx} mt-4 inline-flex items-center gap-2 px-5 py-3 text-[15px] font-semibold`}
          style={{ ...ctx.t.primaryBtn, borderRadius: btnRadius(ctx.t) }}
        >
          <MessageCircle size={17} /> Send a message
        </button>
      )}
    </div>
  );
}

function Footer({ ctx, slug }: { ctx: Ctx; slug?: string }) {
  const copyright = ctx.config.identity?.copyright?.trim();
  return (
    <footer className="text-center pt-10 pb-12 px-5 text-xs" style={{ color: ctx.t.muted }}>
      {copyright && <p className="mb-5 whitespace-pre-line">{copyright}</p>}
      {/* Fixed by Akọ — not part of the config, so a page owner can't remove or restyle it. */}
      <div className="inline-flex flex-col items-center gap-1 pt-4" style={{ borderTop: `1px solid ${ctx.t.rule}` }}>
        <span>Powered by Akọ</span>
        {ctx.preview ? (
          <span className="underline underline-offset-2">Create your own custom page</span>
        ) : (
          <Link
            to={`/me/custom-pages${slug ? `?ref=${encodeURIComponent(slug)}` : ""}`}
            onClick={() => ctx.actions.onCreateYours?.()}
            className="underline underline-offset-2"
            style={{ color: ctx.t.text }}
          >
            Create your own custom page
          </Link>
        )}
      </div>
    </footer>
  );
}

const Section = ({ ctx, i, children, wide }: { ctx: Ctx; i: number; children: ReactNode; wide?: boolean }) => (
  <Reveal animation={ctx.animation} index={i} className={`px-5 w-full mx-auto ${wide ? "max-w-5xl" : "max-w-3xl"}`}>
    {children}
  </Reveal>
);

// ── Templates ───────────────────────────────────────────────────────────────────────────────────────────────
function Showcase({ ctx, slug }: { ctx: Ctx; slug?: string }) {
  const id = ctx.config.identity ?? {};
  const hero = ctx.config.brand?.hero ?? [];
  const titleBlock = (
    <div className="absolute inset-0 flex flex-col items-center justify-end text-center text-white px-6 pb-12" style={{ background: "linear-gradient(to top, rgba(0,0,0,.62), rgba(0,0,0,.08) 62%)" }}>
      <Logo ctx={ctx} size={56} />
      <h1 className="mt-3 text-3xl sm:text-5xl font-bold leading-tight drop-shadow" style={hStyle(ctx)}>
        {id.name}
      </h1>
      {id.tagline && <p className="mt-2 text-base sm:text-lg text-white/90 max-w-xl">{id.tagline}</p>}
    </div>
  );
  return (
    <>
      {hero.length > 0 ? (
        <HeroSlides images={hero} className="w-full aspect-[4/5] sm:aspect-[16/8]" overlay={titleBlock} />
      ) : (
        <div className="px-6 pt-16 pb-10 text-center" style={{ background: ctx.p.primary, color: ctx.p.onPrimary }}>
          <div className="flex justify-center">
            <Logo ctx={ctx} size={56} />
          </div>
          <h1 className="mt-3 text-3xl sm:text-5xl font-bold" style={hStyle(ctx)}>
            {id.name}
          </h1>
          {id.tagline && <p className="mt-2 opacity-90">{id.tagline}</p>}
        </div>
      )}
      <div className="flex flex-col gap-10 pt-10">
        <Section ctx={ctx} i={0}>
          <Intro ctx={ctx} />
        </Section>
        <Section ctx={ctx} i={1}>
          <CtaGroup ctx={ctx} />
        </Section>
        {ctx.config.document?.path && (
          <Section ctx={ctx} i={2}>
            <DocumentCard ctx={ctx} />
          </Section>
        )}
        {(ctx.config.gallery?.length ?? 0) > 0 && (
          <Section ctx={ctx} i={3}>
            <Gallery ctx={ctx} />
          </Section>
        )}
        <Section ctx={ctx} i={4}>
          <Contact ctx={ctx} />
        </Section>
      </div>
      <Footer ctx={ctx} slug={slug} />
    </>
  );
}

function Stacked({ ctx, slug }: { ctx: Ctx; slug?: string }) {
  const id = ctx.config.identity ?? {};
  const hero = ctx.config.brand?.hero ?? [];
  return (
    <>
      <div className="flex flex-col gap-9 pt-12">
        <Section ctx={ctx} i={0}>
          <div className="flex flex-col items-center text-center gap-3">
            <Logo ctx={ctx} size={76} />
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight" style={hStyle(ctx)}>
              {id.name}
            </h1>
            {id.tagline && (
              <p className="max-w-xl" style={{ color: ctx.t.muted }}>
                {id.tagline}
              </p>
            )}
          </div>
        </Section>
        {hero.length > 0 && (
          <Section ctx={ctx} i={1}>
            <HeroSlides images={hero} className="w-full aspect-[16/10]" />
          </Section>
        )}
        <Section ctx={ctx} i={2}>
          <Intro ctx={ctx} />
        </Section>
        <Section ctx={ctx} i={3}>
          <CtaGroup ctx={ctx} block />
        </Section>
        {ctx.config.document?.path && (
          <Section ctx={ctx} i={4}>
            <DocumentCard ctx={ctx} />
          </Section>
        )}
        {(ctx.config.gallery?.length ?? 0) > 0 && (
          <Section ctx={ctx} i={5}>
            <Gallery ctx={ctx} />
          </Section>
        )}
        <Section ctx={ctx} i={6}>
          <Contact ctx={ctx} />
        </Section>
      </div>
      <Footer ctx={ctx} slug={slug} />
    </>
  );
}

function Brochure({ ctx, slug }: { ctx: Ctx; slug?: string }) {
  const id = ctx.config.identity ?? {};
  const hero = ctx.config.brand?.hero ?? [];
  const hasDoc = !!ctx.config.document?.path;
  return (
    <>
      <div className="flex flex-col gap-9 pt-12">
        <Section ctx={ctx} i={0}>
          <div className="flex flex-col items-center text-center gap-2">
            <Logo ctx={ctx} size={52} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: ctx.t.muted }}>
              {id.name}
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold leading-[1.1]" style={hStyle(ctx)}>
              {id.tagline || id.name}
            </h1>
          </div>
        </Section>
        {hasDoc ? (
          <Section ctx={ctx} i={1}>
            <DocumentCard ctx={ctx} />
          </Section>
        ) : (
          <Section ctx={ctx} i={1}>
            <CtaGroup ctx={ctx} />
          </Section>
        )}
        {hero.length > 0 && (
          <Section ctx={ctx} i={2}>
            <HeroSlides images={hero} className="w-full aspect-[16/10]" />
          </Section>
        )}
        <Section ctx={ctx} i={3}>
          <Intro ctx={ctx} />
        </Section>
        {hasDoc && (ctx.config.ctas?.length ?? 0) > 0 && (
          <Section ctx={ctx} i={4}>
            <CtaGroup ctx={ctx} />
          </Section>
        )}
        {(ctx.config.gallery?.length ?? 0) > 0 && (
          <Section ctx={ctx} i={5}>
            <Gallery ctx={ctx} />
          </Section>
        )}
        <Section ctx={ctx} i={6}>
          <Contact ctx={ctx} />
        </Section>
      </div>
      <Footer ctx={ctx} slug={slug} />
    </>
  );
}

function Spotlight({ ctx, slug }: { ctx: Ctx; slug?: string }) {
  const id = ctx.config.identity ?? {};
  const hero = ctx.config.brand?.hero ?? [];
  const content = (
    <div className="max-w-5xl w-full mx-auto">
      <Logo ctx={ctx} size={52} />
      <h1 className="mt-4 leading-[0.92] drop-shadow-lg break-words" style={{ ...hStyle(ctx), fontSize: "clamp(2.75rem, 13vw, 7.5rem)" }}>
        {id.name}
      </h1>
      {id.tagline && <p className="mt-4 text-lg sm:text-2xl max-w-2xl opacity-90">{id.tagline}</p>}
      <div className="mt-7">
        <CtaGroup ctx={ctx} left />
      </div>
    </div>
  );
  return (
    <>
      {hero.length > 0 ? (
        <HeroSlides
          images={hero}
          className="w-full h-[92svh] min-h-[560px]"
          overlay={
            <div className="absolute inset-0 flex flex-col justify-end px-6 sm:px-12 pb-16 text-white" style={{ background: "linear-gradient(to top, rgba(0,0,0,.82), rgba(0,0,0,.3) 48%, rgba(0,0,0,.06))" }}>
              {content}
            </div>
          }
        />
      ) : (
        <div className="min-h-[70svh] flex flex-col justify-end px-6 sm:px-12 pt-20 pb-14" style={{ color: ctx.t.text }}>
          {content}
        </div>
      )}
      <div className="flex flex-col gap-12 pt-14">
        <Section ctx={ctx} i={0}>
          <Intro ctx={ctx} />
        </Section>
        {ctx.config.document?.path && (
          <Section ctx={ctx} i={1}>
            <DocumentCard ctx={ctx} />
          </Section>
        )}
        {(ctx.config.gallery?.length ?? 0) > 0 && (
          <Section ctx={ctx} i={2} wide>
            <Gallery ctx={ctx} variant="big" />
          </Section>
        )}
        <Section ctx={ctx} i={3}>
          <Contact ctx={ctx} />
        </Section>
      </div>
      <Footer ctx={ctx} slug={slug} />
    </>
  );
}

function Linkcard({ ctx, slug }: { ctx: Ctx; slug?: string }) {
  const id = ctx.config.identity ?? {};
  const hero = ctx.config.brand?.hero ?? [];
  const col = "max-w-md mx-auto w-full";
  return (
    <>
      <div className="flex flex-col gap-7 pt-14">
        <Section ctx={ctx} i={0}>
          <div className={`${col} flex flex-col items-center text-center gap-3`}>
            <Logo ctx={ctx} size={96} ring />
            <h1 className="text-3xl leading-tight mt-1" style={hStyle(ctx)}>
              {id.name}
            </h1>
            {id.tagline && (
              <p className="text-[15px]" style={{ color: ctx.t.muted }}>
                {id.tagline}
              </p>
            )}
          </div>
        </Section>
        <Section ctx={ctx} i={1}>
          <div className={col}>
            <CtaGroup ctx={ctx} block />
          </div>
        </Section>
        {hero.length > 0 && (
          <Section ctx={ctx} i={2}>
            <div className={`${col} overflow-hidden`} style={{ borderRadius: Math.min(ctx.t.radius + 2, 28) }}>
              <HeroSlides images={hero} className="w-full aspect-[16/10]" />
            </div>
          </Section>
        )}
        <Section ctx={ctx} i={3}>
          <div className={col}>
            <Intro ctx={ctx} />
          </div>
        </Section>
        {ctx.config.document?.path && (
          <Section ctx={ctx} i={4}>
            <div className={col}>
              <DocumentCard ctx={ctx} />
            </div>
          </Section>
        )}
        {(ctx.config.gallery?.length ?? 0) > 0 && (
          <Section ctx={ctx} i={5}>
            <div className={col}>
              <Gallery ctx={ctx} variant="small" />
            </div>
          </Section>
        )}
        <Section ctx={ctx} i={6}>
          <div className={col}>
            <Contact ctx={ctx} />
          </div>
        </Section>
      </div>
      <Footer ctx={ctx} slug={slug} />
    </>
  );
}

function Split({ ctx, slug }: { ctx: Ctx; slug?: string }) {
  const id = ctx.config.identity ?? {};
  const hero = ctx.config.brand?.hero ?? [];
  const hasHero = hero.length > 0;
  return (
    <>
      <div className="px-5 pt-10 sm:pt-16 w-full max-w-6xl mx-auto">
        <div className={`grid gap-8 sm:gap-14 items-center ${hasHero ? "sm:grid-cols-2" : ""}`}>
          {hasHero && (
            <Reveal animation={ctx.animation} index={0} className="sm:order-2">
              <div className="overflow-hidden" style={{ borderRadius: Math.max(ctx.t.radius, 18) + 8, ...(ctx.style === "neo" ? { border: `2px solid ${ctx.t.ink}`, boxShadow: `8px 8px 0 ${ctx.t.ink}` } : null) }}>
                <HeroSlides images={hero} className="w-full aspect-[4/5]" />
              </div>
            </Reveal>
          )}
          <Reveal animation={ctx.animation} index={1} className="sm:order-1 flex flex-col gap-5 items-start text-left">
            <Logo ctx={ctx} size={60} />
            <h1 className="leading-[1] break-words" style={{ ...hStyle(ctx), fontSize: "clamp(2.4rem, 8vw, 4.6rem)" }}>
              {id.name}
            </h1>
            {id.tagline && (
              <p className="text-lg sm:text-xl max-w-md" style={{ color: ctx.t.muted }}>
                {id.tagline}
              </p>
            )}
            <Intro ctx={ctx} left />
            <CtaGroup ctx={ctx} left />
          </Reveal>
        </div>
      </div>
      <div className="flex flex-col gap-12 pt-14">
        {ctx.config.document?.path && (
          <Section ctx={ctx} i={2}>
            <DocumentCard ctx={ctx} />
          </Section>
        )}
        {(ctx.config.gallery?.length ?? 0) > 0 && (
          <Section ctx={ctx} i={3} wide>
            <Gallery ctx={ctx} variant="bento" />
          </Section>
        )}
        <Section ctx={ctx} i={4}>
          <Contact ctx={ctx} />
        </Section>
      </div>
      <Footer ctx={ctx} slug={slug} />
    </>
  );
}

function Portfolio({ ctx, slug }: { ctx: Ctx; slug?: string }) {
  const id = ctx.config.identity ?? {};
  const hero = ctx.config.brand?.hero ?? [];
  const gallery = ctx.config.gallery ?? [];
  const items = gallery.length > 0 ? [...hero.slice(0, 1), ...gallery] : hero;
  return (
    <>
      <div className="flex flex-col gap-10 pt-14 sm:pt-20">
        <Section ctx={ctx} i={0} wide>
          <div className="flex flex-col gap-5 items-start text-left">
            <div className="flex items-center gap-3">
              <Logo ctx={ctx} size={40} />
              <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: ctx.t.muted }}>
                {id.name}
              </p>
            </div>
            <h1 className="leading-[0.98] break-words max-w-4xl" style={{ ...hStyle(ctx), fontSize: "clamp(2.6rem, 10vw, 6rem)" }}>
              {id.tagline || id.name}
            </h1>
            <CtaGroup ctx={ctx} left />
          </div>
        </Section>
        {items.length > 0 && (
          <Section ctx={ctx} i={1} wide>
            <Gallery ctx={ctx} variant="bento" items={items} />
          </Section>
        )}
        <Section ctx={ctx} i={2} wide>
          <div className="grid sm:grid-cols-[1.4fr_1fr] gap-8 items-start">
            <Intro ctx={ctx} left />
            {ctx.config.document?.path ? <DocumentCard ctx={ctx} /> : <Contact ctx={ctx} />}
          </div>
        </Section>
        {ctx.config.document?.path && (
          <Section ctx={ctx} i={3}>
            <Contact ctx={ctx} />
          </Section>
        )}
      </div>
      <Footer ctx={ctx} slug={slug} />
    </>
  );
}

const LAYOUTS: Record<TemplateId, (props: { ctx: Ctx; slug?: string }) => ReactNode> = {
  showcase: Showcase,
  stacked: Stacked,
  brochure: Brochure,
  spotlight: Spotlight,
  linkcard: Linkcard,
  split: Split,
  portfolio: Portfolio,
};

export function CustomPageRenderer({ config, preview = false, actions = {}, slug }: Props) {
  const { style, template, animation } = resolveDesign(config);
  const p = resolvePalette(config);
  const t = styleTokens(style, p);
  const ctx: Ctx = { config, p, t, style, animation, preview, actions };
  const Layout = LAYOUTS[template];
  return (
    <div
      className={`cp-root min-h-full w-full overflow-x-hidden ${t.drift ? "cp-drift" : ""}`}
      style={{ ...t.pageStyle, ["--cp-glow" as string]: t.glow ?? "rgba(0,0,0,.25)", ["--cp-ink" as string]: t.ink ?? "#14120F" }}
    >
      <style>{CP_CSS}</style>
      <Layout ctx={ctx} slug={slug} />
    </div>
  );
}
