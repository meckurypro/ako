// src/components/customPage/CustomPageRenderer.tsx
//
// Renders a Custom Page config. Pure presentation: no data fetching, no routing decisions. The public route
// (pages/CustomPageView.tsx) and the editor's live preview both use it, so what a person previews is what visitors get.
//
// Three decisions are kept apart on purpose:
//   • style     — the visual language (minimalist / glass / elegant): surfaces, type, corners.
//   • template  — the arrangement of sections (showcase / stacked / brochure).
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
}

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
    borderRadius: t.radius > 20 ? 999 : Math.min(t.radius, 12),
  };
  const cls = `inline-flex items-center justify-center gap-2 px-6 py-3.5 text-[15px] font-semibold transition-transform active:scale-[0.98] ${block ? "w-full" : ""}`;
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

function CtaGroup({ ctx, block }: { ctx: Ctx; block?: boolean }) {
  // A draft can hold a button that has no label yet — never draw an empty pill for it.
  const ctas = (ctx.config.ctas ?? []).filter((c) => c.label.trim());
  if (!ctas.length) return null;
  return (
    <div className={`flex flex-wrap gap-3 ${block ? "flex-col" : "justify-center"}`}>
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
      style={{ fontFamily: ctx.t.heading, color: ctx.t.text }}
    >
      {children}
    </h2>
  );
}

function Logo({ ctx, size = 64 }: { ctx: Ctx; size?: number }) {
  const url = publicFileUrl(ctx.config.identity?.icon_path);
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className="object-cover"
      style={{ width: size, height: size, borderRadius: ctx.style === "elegant" ? 4 : size / 4 }}
    />
  );
}

function Intro({ ctx }: { ctx: Ctx }) {
  const intro = ctx.config.identity?.intro?.trim();
  if (!intro) return null;
  return (
    <p className="text-[17px] leading-relaxed whitespace-pre-line text-center max-w-2xl mx-auto" style={{ color: ctx.t.text }}>
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
    <div className="p-6 sm:p-8 text-center" style={{ ...ctx.t.card, borderRadius: ctx.t.radius }}>
      <FileText size={34} className="mx-auto mb-3" style={{ color: ctx.t.text, opacity: 0.85 }} />
      <h3 className="text-xl font-semibold mb-1" style={{ fontFamily: ctx.t.heading }}>
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
          className="inline-flex items-center gap-2 px-6 py-3.5 text-[15px] font-semibold"
          style={{ ...ctx.t.primaryBtn, borderRadius: ctx.t.radius > 20 ? 999 : Math.min(ctx.t.radius, 12) }}
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
          className="inline-flex items-center gap-2 px-6 py-3.5 text-[15px] font-semibold"
          style={{ ...ctx.t.secondaryBtn, borderRadius: ctx.t.radius > 20 ? 999 : Math.min(ctx.t.radius, 12) }}
        >
          <Download size={17} /> Download
        </a>
      </div>
    </div>
  );
}

function Gallery({ ctx }: { ctx: Ctx }) {
  const items = ctx.config.gallery ?? [];
  const [open, setOpen] = useState<number | null>(null);
  if (!items.length) return null;
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {items.map((g, i) => (
          <Reveal key={g.path} animation={ctx.animation} index={i % 6}>
            <button
              type="button"
              onClick={() => !ctx.preview && setOpen(i)}
              className="block w-full aspect-square overflow-hidden"
              style={{ borderRadius: Math.min(ctx.t.radius, 16) }}
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
    <div className="p-6 sm:p-8" style={{ ...ctx.t.card, borderRadius: ctx.t.radius }}>
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
          className="mt-4 inline-flex items-center gap-2 px-5 py-3 text-[15px] font-semibold"
          style={{ ...ctx.t.primaryBtn, borderRadius: ctx.t.radius > 20 ? 999 : Math.min(ctx.t.radius, 12) }}
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

const Section = ({ ctx, i, children }: { ctx: Ctx; i: number; children: ReactNode }) => (
  <Reveal animation={ctx.animation} index={i} className="px-5 w-full max-w-3xl mx-auto">
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
      <h1 className="mt-3 text-3xl sm:text-5xl font-bold leading-tight drop-shadow" style={{ fontFamily: ctx.t.heading }}>
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
          <h1 className="mt-3 text-3xl sm:text-5xl font-bold" style={{ fontFamily: ctx.t.heading }}>
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
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight" style={{ fontFamily: ctx.t.heading }}>
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
            <h1 className="text-4xl sm:text-5xl font-bold leading-[1.1]" style={{ fontFamily: ctx.t.heading }}>
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

const LAYOUTS: Record<TemplateId, (props: { ctx: Ctx; slug?: string }) => ReactNode> = {
  showcase: Showcase,
  stacked: Stacked,
  brochure: Brochure,
};

export function CustomPageRenderer({ config, preview = false, actions = {}, slug }: Props) {
  const { style, template, animation } = resolveDesign(config);
  const p = resolvePalette(config);
  const t = styleTokens(style, p);
  const ctx: Ctx = { config, p, t, style, animation, preview, actions };
  const Layout = LAYOUTS[template];
  return (
    <div className="min-h-full w-full overflow-x-hidden" style={t.pageStyle}>
      <Layout ctx={ctx} slug={slug} />
    </div>
  );
}
