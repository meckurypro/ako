// src/components/customPage/CustomPageRenderer.tsx
//
// Renders a Custom Page config. Pure presentation: no data fetching, no routing decisions. The public route
// (pages/CustomPageView.tsx) and the editor's live preview both use it, so what a person previews is what visitors get.
//
// Three decisions are kept apart on purpose:
//   • style     — the visual language (minimalist / glass / elegant / midnight / aurora / bold / soft / neo / clay / chrome / mono / organic / forge / noir / nebula / duotone / sand / confetti / skyline / azure / aqua / candy / ultraviolet): surfaces, type, corners, micro-interactions.
//   • template  — the arrangement of sections (showcase / stacked / brochure / spotlight / linkcard / split / portfolio / bento / poster / console / showreel / frame / duo / portrait / arch / banner / diagonal / wave / diamond / float).
//   • animation — how sections arrive (a preset, applied uniformly; never per element).
// Add a style by extending styleTokens(); add a template by adding an entry to LAYOUTS. Neither touches the database —
// design values are just short slugs in the config.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Download, FileText, Loader2, Mail, MapPin, MessageCircle, Phone, ExternalLink, X } from "lucide-react";
import {
  LOOK_CSS,
  availableNavTargets,
  customPageUrl,
  publicFileUrl,
  readableOn,
  isHex,
  resolveBackground,
  resolveDesign,
  resolveForeground,
  resolveNav,
  resolveShare,
  resolvePalette,
  shadowGeometry,
  type ResolvedForeground,
  withAlpha,
  type AnimationId,
  type CustomPageConfig,
  type CustomPageCta,
  type StyleId,
  type TemplateId,
} from "../../lib/customPage";
import { Reveal } from "./Reveal";
import { HeroSlides } from "./HeroSlides";
import { useFileDownload } from "../../hooks/useFileDownload";
import { shapeMaskUrl } from "../../lib/customPageShapes";
import { findScroller, scrollToElement } from "../../lib/customPageScroll";

type Palette = ReturnType<typeof resolvePalette>;

export interface CustomPageActions {
  /** A button was tapped. Analytics hook — never required to navigate. */
  onCta?: (cta: CustomPageCta) => void;
  onOpenInquiry?: () => void;
  onMessageOwner?: () => void;
  onDocumentRead?: () => void;
  onDocumentDownload?: () => void;
  /** The share button was used. Analytics hook only. */
  onShare?: () => void;
  /** "Create your own custom page" footer link. */
  onCreateYours?: () => void;
  /** True when the visitor is signed in to Akọ — the footer then offers a quiet way back into the app. */
  signedIn?: boolean;
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
  /** CSS clip-path that cuts the buttons into a slanted or chamfered shape (Forge, Noir Copper). */
  btnClip?: string;
  /** Micro-interaction family for buttons. */
  fx: "lift" | "shine" | "glow" | "hard" | "squish";
  /** Card corner radius override (px or a CSS blob radius). */
  cardRadius?: number | string;
  /** Gradient painted into big headings (Chrome). */
  headingGradient?: string;
  grain?: boolean;
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
.cp-root .cp-squish{transition:transform .35s cubic-bezier(.34,1.56,.64,1),box-shadow .25s ease}
@media (hover:hover){.cp-root .cp-squish:hover{transform:scale(1.04)}}
.cp-root .cp-squish:active{transform:scale(.93)}
.cp-root.cp-grain{position:relative}
.cp-root.cp-grain::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.1;mix-blend-mode:multiply;z-index:5;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
.cp-root .cp-bg{height:100vh;height:100dvh}
.cp-root .cp-marquee{display:flex;width:max-content;animation:cp-marquee 24s linear infinite}
@keyframes cp-marquee{to{transform:translateX(-50%)}}
.cp-root .cp-mask-l{-webkit-mask-image:linear-gradient(180deg,#000 70%,transparent);mask-image:linear-gradient(180deg,#000 70%,transparent)}
@media (min-width:640px){.cp-root .cp-mask-l{-webkit-mask-image:linear-gradient(90deg,transparent,#000 32%);mask-image:linear-gradient(90deg,transparent,#000 32%)}}
@keyframes cp-shine{0%,55%{left:-60%}100%{left:140%}}
@keyframes cp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes cp-drift{0%{background-position:0% 0%}100%{background-position:100% 100%}}
@media (prefers-reduced-motion:reduce){.cp-root,.cp-root *,.cp-root *::after{animation:none!important;transition:none!important}}
`;

/** Inline an SVG string as a CSS background image. */
const svgUrl = (svg: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
/** A glossy sphere painted with two gradients: the body and a small highlight. Layer it into a CSS background list. */
const orb = (x: string, y: string, r: number, hi: string, mid: string, lo: string) =>
  `radial-gradient(circle ${Math.round(r * 0.26)}px at calc(${x} - ${Math.round(r * 0.34)}px) calc(${y} - ${Math.round(r * 0.34)}px), rgba(255,255,255,0.9), transparent 100%), radial-gradient(circle ${r}px at ${x} ${y}, ${hi} 0, ${mid} 40%, ${lo} 92%, transparent 100%)`;

function styleTokens(style: StyleId, p: Palette): Tokens {
  const serif = '"Fraunces", Georgia, serif';
  const sans = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';
  if (style === "forge") {
    const grid = svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><path d='M48 0H0V48' fill='none' stroke='white' stroke-opacity='.05'/></svg>`);
    return {
      pageStyle: {
        background: `${grid}, radial-gradient(70% 45% at 88% 0%, ${withAlpha(p.accent, 0.3)}, transparent 70%), radial-gradient(60% 40% at 0% 100%, ${withAlpha(p.accent, 0.14)}, transparent 70%), #121214`,
        color: "#F4F1EC",
        fontFamily: sans,
      },
      text: "#F4F1EC",
      muted: "rgba(244,241,236,0.66)",
      heading: '"Orbitron", "Inter", sans-serif',
      headingWeight: 800,
      headingTracking: "0.03em",
      headingCase: "uppercase",
      card: { background: "linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))", border: "1px solid rgba(255,255,255,0.1)" },
      radius: 8,
      primaryBtn: { background: p.accent, color: p.onAccent, border: "none" },
      secondaryBtn: { background: "rgba(255,255,255,0.08)", color: "#F4F1EC", border: "none" },
      rule: "rgba(255,255,255,0.14)",
      btnRadius: 0,
      btnClip: "polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)",
      fx: "glow",
      glow: withAlpha(p.accent, 0.6),
    };
  }
  if (style === "noir") {
    return {
      pageStyle: {
        background: `radial-gradient(60% 40% at 72% 18%, ${withAlpha(p.accent, 0.14)}, transparent 70%), radial-gradient(80% 60% at 50% 120%, rgba(60,70,110,0.28), transparent 70%), #08080A`,
        color: "#EDE6DD",
        fontFamily: sans,
      },
      text: "#EDE6DD",
      muted: "rgba(237,230,221,0.64)",
      heading: '"Jost", "Inter", sans-serif',
      headingWeight: 500,
      headingTracking: "0.02em",
      headingCase: "uppercase",
      headingGradient: `linear-gradient(180deg, ${p.accent}, ${withAlpha(p.accent, 0.82)})`,
      card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" },
      radius: 4,
      primaryBtn: { background: p.accent, color: p.onAccent, border: "none" },
      secondaryBtn: { background: "rgba(255,255,255,0.07)", color: "#EDE6DD", border: "none" },
      rule: "rgba(255,255,255,0.12)",
      btnRadius: 0,
      btnClip: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
      fx: "lift",
    };
  }
  if (style === "nebula") {
    return {
      pageStyle: {
        background: `radial-gradient(70% 38% at 50% -6%, ${withAlpha(p.accent, 0.75)}, transparent 72%), radial-gradient(80% 45% at 50% 108%, ${withAlpha(p.primary, 0.85)}, transparent 70%), #1B0D3F`,
        color: "#F7F4FF",
        fontFamily: sans,
      },
      text: "#F7F4FF",
      muted: "rgba(247,244,255,0.72)",
      heading: '"Bebas Neue", "Oswald", Impact, sans-serif',
      headingWeight: 400,
      headingTracking: "0.01em",
      headingCase: "uppercase",
      card: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.16)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" },
      radius: 28,
      primaryBtn: { background: p.accent, color: p.onAccent, border: "1px solid transparent" },
      secondaryBtn: { background: "transparent", color: "#FFFFFF", border: "1.5px solid rgba(255,255,255,0.85)" },
      rule: "rgba(255,255,255,0.18)",
      btnRadius: 999,
      fx: "glow",
      float: true,
      glow: withAlpha(p.accent, 0.6),
    };
  }
  if (style === "duotone") {
    return {
      pageStyle: { background: "radial-gradient(60% 40% at 20% 0%, rgba(255,255,255,0.9), transparent 70%), #E9E9EB", color: "#0E0E10", fontFamily: sans },
      text: "#0E0E10",
      muted: "rgba(14,14,16,0.62)",
      heading: sans,
      headingWeight: 300,
      headingTracking: "-0.035em",
      card: { background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.08)" },
      radius: 14,
      primaryBtn: { background: "#0E0E10", color: "#FFFFFF", border: "1px solid #0E0E10" },
      secondaryBtn: { background: "transparent", color: "#0E0E10", border: "1px solid rgba(0,0,0,0.2)" },
      rule: "rgba(0,0,0,0.14)",
      btnRadius: 999,
      fx: "lift",
    };
  }
  if (style === "sand") {
    return {
      pageStyle: { background: "radial-gradient(70% 50% at 100% 0%, rgba(255,255,255,0.55), transparent 70%), #E7E2D9", color: "#4B4338", fontFamily: sans },
      text: "#4B4338",
      muted: "rgba(75,67,56,0.7)",
      heading: sans,
      headingWeight: 800,
      headingTracking: "-0.02em",
      card: { background: "rgba(255,255,255,0.45)", border: "1px solid rgba(75,67,56,0.14)" },
      radius: 6,
      primaryBtn: { background: p.primary, color: p.onPrimary, border: `1px solid ${p.primary}` },
      secondaryBtn: { background: "transparent", color: "#4B4338", border: "1px solid rgba(75,67,56,0.55)" },
      rule: "rgba(75,67,56,0.22)",
      btnRadius: 2,
      fx: "lift",
    };
  }
  if (style === "confetti") {
    const shapes = svgUrl(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 800'><circle cx='520' cy='64' r='30' fill='#BFE3D6'/><g transform='translate(860 80) rotate(12)'><rect width='84' height='84' fill='#F6CFC8'/><path d='M0 14H84M0 34H84M0 54H84M0 74H84' stroke='#fff' stroke-width='8' opacity='.7'/></g><rect x='60' y='560' width='96' height='30' rx='15' fill='${p.accent}'/><path d='M930 520l26 26-26 26-26-26z' fill='#A3AB98'/><path d='M930 584l26 26-26 26-26-26z' fill='#A3AB98'/><circle cx='930' cy='330' r='34' fill='none' stroke='${p.accent}' stroke-width='14'/></svg>`,
    );
    return {
      pageStyle: { background: `${shapes} 0 0 / 100% auto no-repeat, #F3EFE8`, color: "#2B2A28", fontFamily: sans },
      text: "#2B2A28",
      muted: "rgba(43,42,40,0.66)",
      heading: '"Playfair Display", "Fraunces", Georgia, serif',
      headingWeight: 600,
      headingTracking: "-0.01em",
      card: { background: "rgba(255,255,255,0.72)", border: "1px solid rgba(43,42,40,0.08)" },
      radius: 22,
      primaryBtn: { background: p.primary, color: p.onPrimary, border: `1px solid ${p.primary}` },
      secondaryBtn: { background: "transparent", color: "#2B2A28", border: "1px solid rgba(43,42,40,0.35)" },
      rule: "rgba(43,42,40,0.16)",
      btnRadius: 999,
      fx: "lift",
    };
  }
  if (style === "skyline") {
    const dots = svgUrl(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 320'><g fill='#4FB0FF'><rect x='430' y='22' width='12' height='12'/><rect x='470' y='52' width='12' height='12'/><rect x='930' y='40' width='12' height='12'/><rect x='966' y='84' width='12' height='12'/><rect x='900' y='110' width='12' height='12'/></g><g fill='none' stroke='#6D8FD0' stroke-width='3'><rect x='400' y='58' width='14' height='14'/><rect x='520' y='24' width='14' height='14'/><rect x='940' y='146' width='14' height='14'/><rect x='870' y='60' width='14' height='14'/></g></svg>`,
    );
    const waves = svgUrl(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 160' preserveAspectRatio='none'><path d='M0 110C200 40 380 150 620 96S1040 40 1440 110' fill='none' stroke='#7DBBF5' stroke-width='3'/><path d='M0 130C260 80 420 40 700 110S1120 150 1440 80' fill='none' stroke='#6D8FD0' stroke-width='3' opacity='.7'/></svg>`,
    );
    return {
      pageStyle: { background: `${dots} 0 0 / 100% auto no-repeat, ${waves} 0 100% / 100% 150px no-repeat, #E6F3FF`, color: "#0B1B3F", fontFamily: sans },
      text: "#0B1B3F",
      muted: "rgba(11,27,63,0.66)",
      heading: '"Outfit", "Inter", sans-serif',
      headingWeight: 600,
      headingTracking: "-0.02em",
      card: { background: "rgba(255,255,255,0.75)", border: "1px solid rgba(11,27,63,0.08)" },
      radius: 20,
      primaryBtn: { background: p.primary, color: p.onPrimary, border: `1px solid ${p.primary}` },
      secondaryBtn: { background: "rgba(255,255,255,0.7)", color: "#0B1B3F", border: "1px solid rgba(11,27,63,0.2)" },
      rule: "rgba(11,27,63,0.14)",
      btnRadius: 12,
      fx: "lift",
    };
  }
  if (style === "azure") {
    const blocks = svgUrl(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 700'><path d='M1000 0V430L630 0Z' fill='${p.primary}' opacity='.92'/><path d='M1000 0V250L790 0Z' fill='#fff' opacity='.28'/><circle cx='640' cy='120' r='9' fill='none' stroke='${p.primary}' stroke-width='2' opacity='.6'/></svg>`,
    );
    return {
      pageStyle: { background: `${blocks} 100% 0 / min(100%, 900px) auto no-repeat, #F6F9FC`, color: "#0C1B2E", fontFamily: sans },
      text: "#0C1B2E",
      muted: "rgba(12,27,46,0.64)",
      heading: '"Poppins", "Inter", sans-serif',
      headingWeight: 700,
      headingTracking: "-0.02em",
      card: { background: "#FFFFFF", border: "1px solid rgba(12,27,46,0.08)", boxShadow: "0 10px 30px -18px rgba(12,27,46,0.25)" },
      radius: 16,
      primaryBtn: { background: p.primary, color: p.onPrimary, border: `1px solid ${p.primary}` },
      secondaryBtn: { background: "#FFFFFF", color: "#0C1B2E", border: "1px solid rgba(12,27,46,0.16)" },
      rule: "rgba(12,27,46,0.12)",
      btnRadius: 10,
      fx: "lift",
    };
  }
  if (style === "aqua") {
    return {
      pageStyle: {
        background: `${orb("90%", "26%", 64, "#D9FFFA", "#6FDCD0", "#2AAFA6")}, ${orb("8%", "74%", 44, "#D9FFFA", "#7FE0D6", "#32B8AE")}, radial-gradient(60% 40% at 90% 96%, rgba(52,190,190,0.5), transparent 70%), linear-gradient(135deg, #E4FFF9 0%, #B5F0E8 55%, #8FE3DA 100%)`,
        color: "#0C2238",
        fontFamily: sans,
      },
      text: "#0C2238",
      muted: "rgba(12,34,56,0.68)",
      heading: '"Poppins", "Inter", sans-serif',
      headingWeight: 600,
      headingTracking: "-0.02em",
      card: { background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.7)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" },
      radius: 18,
      primaryBtn: { background: "#0C2238", color: "#FFFFFF", border: "1px solid #0C2238" },
      secondaryBtn: { background: "transparent", color: "#0C2238", border: "1px solid #0C2238" },
      rule: "rgba(12,34,56,0.2)",
      btnRadius: 8,
      fx: "lift",
    };
  }
  if (style === "candy") {
    return {
      pageStyle: {
        background: `${orb("88%", "14%", 54, "#E4FFF9", "#7ADCCB", "#2BB5A3")}, ${orb("6%", "58%", 34, "#FFE8F0", "#F2A6C4", "#D9739F")}, ${orb("92%", "62%", 40, "#E7E4FF", "#8F8CF0", "#4B4CE0")}, radial-gradient(80% 50% at 100% 0%, rgba(160,150,255,0.35), transparent 70%), radial-gradient(70% 50% at 0% 100%, rgba(255,160,200,0.4), transparent 70%), #FDF1F5`,
        color: "#1B1938",
        fontFamily: sans,
      },
      text: "#1B1938",
      muted: "rgba(27,25,56,0.64)",
      heading: '"Poppins", "Inter", sans-serif',
      headingWeight: 700,
      headingTracking: "-0.02em",
      card: { background: "rgba(255,255,255,0.72)", border: "1px solid rgba(255,255,255,0.9)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", boxShadow: "0 18px 40px -24px rgba(75,76,224,0.35)" },
      radius: 26,
      primaryBtn: { background: `linear-gradient(135deg, ${p.primary}, ${withAlpha(p.primary, 0.82)})`, color: p.onPrimary, border: "1px solid transparent", boxShadow: `0 12px 28px -10px ${withAlpha(p.primary, 0.65)}` },
      secondaryBtn: { background: "transparent", color: "#1B1938", border: "1px solid rgba(27,25,56,0.35)" },
      rule: "rgba(27,25,56,0.14)",
      btnRadius: 14,
      fx: "glow",
      float: true,
      glow: withAlpha(p.primary, 0.6),
    };
  }
  if (style === "ultraviolet") {
    return {
      pageStyle: {
        background: `${orb("90%", "18%", 56, "#FFE3FA", "#FF6ADF", "#8C2BD8")}, ${orb("8%", "66%", 36, "#D9F4FF", "#52C7F0", "#2A6BDA")}, ${orb("94%", "70%", 44, "#FFE3F6", "#C04BFF", "#5A1CB5")}, radial-gradient(70% 45% at 85% 10%, rgba(255,70,200,0.35), transparent 70%), radial-gradient(60% 40% at 0% 100%, rgba(60,120,255,0.3), transparent 70%), linear-gradient(160deg, #4A12A8, #220A58 55%, #2E0C6E)`,
        color: "#FFFFFF",
        fontFamily: sans,
      },
      text: "#FFFFFF",
      muted: "rgba(255,255,255,0.74)",
      heading: '"Poppins", "Inter", sans-serif',
      headingWeight: 800,
      headingTracking: "-0.025em",
      card: { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" },
      radius: 24,
      primaryBtn: { background: `linear-gradient(135deg, ${p.accent}, #8C3BFF)`, color: "#FFFFFF", border: "1px solid transparent", boxShadow: `0 12px 32px -10px ${withAlpha(p.accent, 0.7)}` },
      secondaryBtn: { background: "transparent", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.7)" },
      rule: "rgba(255,255,255,0.2)",
      btnRadius: 12,
      fx: "glow",
      float: true,
      glow: withAlpha(p.accent, 0.65),
    };
  }
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
  if (style === "clay") {
    const darkBg = p.onSecondary === "#FFFFFF";
    const puff = darkBg
      ? "inset 0 6px 12px rgba(255,255,255,0.1), inset 0 -8px 14px rgba(0,0,0,0.3), 0 20px 36px -16px rgba(0,0,0,0.6)"
      : "inset 0 6px 12px rgba(255,255,255,0.95), inset 0 -8px 14px rgba(0,0,0,0.07), 0 20px 36px -16px rgba(20,20,40,0.25)";
    return {
      pageStyle: { background: `radial-gradient(70% 35% at 15% 0%, ${withAlpha(p.accent, 0.22)}, transparent 70%), radial-gradient(60% 30% at 100% 40%, ${withAlpha(p.primary, 0.14)}, transparent 70%), ${p.secondary}`, color: p.onSecondary, fontFamily: sans },
      text: p.onSecondary,
      muted: withAlpha(p.onSecondary === "#FFFFFF" ? "#FFFFFF" : "#000000", 0.66),
      heading: sans,
      headingWeight: 800,
      headingTracking: "-0.03em",
      card: { background: darkBg ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.78)", boxShadow: puff },
      radius: 36,
      primaryBtn: {
        background: `linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0) 55%), ${p.primary}`,
        color: p.onPrimary,
        border: "none",
        boxShadow: `inset 0 3px 6px rgba(255,255,255,0.45), inset 0 -5px 10px rgba(0,0,0,0.18), 0 14px 26px -10px ${withAlpha(p.primary, 0.75)}`,
      },
      secondaryBtn: { background: darkBg ? "rgba(255,255,255,0.12)" : "#FFFFFF", color: p.onSecondary, border: "none", boxShadow: darkBg ? "inset 0 3px 6px rgba(255,255,255,0.12), 0 10px 20px -10px rgba(0,0,0,0.6)" : "inset 0 3px 6px rgba(255,255,255,1), inset 0 -4px 8px rgba(0,0,0,0.06), 0 10px 22px -10px rgba(20,20,40,0.3)" },
      rule: withAlpha(p.onSecondary === "#FFFFFF" ? "#FFFFFF" : "#000000", 0.12),
      btnRadius: 999,
      fx: "squish",
      logoRound: 0.38,
      float: true,
    };
  }
  if (style === "chrome") {
    const ink = "#1A1D29";
    return {
      pageStyle: {
        background: `radial-gradient(60% 38% at 18% 0%, ${withAlpha(p.accent, 0.5)}, transparent 72%), radial-gradient(50% 36% at 92% 18%, rgba(90,200,255,0.5), transparent 72%), radial-gradient(60% 45% at 50% 100%, rgba(255,150,225,0.42), transparent 72%), linear-gradient(180deg, #EEF1F8, #D7DDEA)`,
        color: ink,
        fontFamily: sans,
      },
      text: ink,
      muted: "rgba(26,29,41,0.66)",
      heading: sans,
      headingWeight: 800,
      headingTracking: "-0.035em",
      headingGradient: "linear-gradient(180deg, #2B3050 0%, #8A93B3 48%, #1A1D29 100%)",
      card: {
        background: "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.4))",
        border: "1px solid rgba(255,255,255,0.95)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: "inset 0 1px 0 #fff, 0 22px 44px -22px rgba(40,50,90,0.4)",
      },
      radius: 22,
      primaryBtn: {
        background: "linear-gradient(180deg, #FDFEFF 0%, #CBD1E0 47%, #AFB7CB 53%, #E8ECF5 100%)",
        color: ink,
        border: "1px solid #8F98B0",
        textShadow: "0 1px 0 rgba(255,255,255,0.8)",
        boxShadow: "inset 0 1px 0 #fff, 0 8px 16px -8px rgba(30,40,80,0.55)",
      },
      secondaryBtn: { background: "rgba(255,255,255,0.45)", color: ink, border: "1px solid rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" },
      rule: "rgba(26,29,41,0.18)",
      btnRadius: 999,
      fx: "shine",
      logoRound: 0.3,
      float: true,
    };
  }
  if (style === "mono") {
    const dark = p.onSecondary === "#FFFFFF";
    const paper = dark ? "#0A0A0A" : "#F6F6F3";
    const ink = dark ? "#F6F6F3" : "#0A0A0A";
    return {
      pageStyle: { background: paper, color: ink, fontFamily: sans },
      text: ink,
      muted: withAlpha(ink, 0.6),
      heading: sans,
      headingWeight: 600,
      headingTracking: "-0.045em",
      card: { background: "transparent", borderTop: `1px solid ${ink}` },
      radius: 0,
      primaryBtn: { background: ink, color: paper, border: `1px solid ${ink}`, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12 },
      secondaryBtn: { background: "transparent", color: ink, border: `1px solid ${ink}`, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12 },
      rule: withAlpha(ink, 0.25),
      btnRadius: 0,
      fx: "lift",
      logoRound: 0,
      cardRadius: 0,
      ink,
    };
  }
  if (style === "organic") {
    const darkBg = p.onSecondary === "#FFFFFF";
    return {
      pageStyle: {
        background: `radial-gradient(45% 28% at 92% 6%, ${withAlpha(p.accent, 0.26)}, transparent 72%), radial-gradient(50% 32% at 0% 58%, ${withAlpha(p.primary, 0.16)}, transparent 72%), ${p.secondary}`,
        color: p.onSecondary,
        fontFamily: '"Newsreader", Georgia, serif',
      },
      text: p.onSecondary,
      muted: withAlpha(darkBg ? "#FFFFFF" : "#000000", 0.64),
      heading: serif,
      headingWeight: 700,
      headingTracking: "-0.02em",
      card: { background: withAlpha(p.primary, darkBg ? 0.22 : 0.07), border: `1px solid ${withAlpha(darkBg ? "#FFFFFF" : "#000000", 0.1)}` },
      radius: 36,
      cardRadius: "46px 66px 40px 70px / 54px 42px 62px 46px",
      primaryBtn: { background: p.primary, color: p.onPrimary, border: `1px solid ${p.primary}` },
      secondaryBtn: { background: "transparent", color: p.onSecondary, border: `1px solid ${withAlpha(darkBg ? "#FFFFFF" : "#000000", 0.28)}` },
      rule: withAlpha(darkBg ? "#FFFFFF" : "#000000", 0.16),
      btnRadius: 999,
      fx: "lift",
      logoRound: 0.42,
      float: true,
      grain: true,
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
  /** Space the page menu takes at the top / bottom, so floating pieces (the share button) stay clear of it. */
  navInset: { top: number; bottom: number };
}

const btnRadius = (t: Tokens) => t.btnRadius ?? (t.radius > 20 ? 999 : Math.min(t.radius, 12));
const hStyle = (ctx: { t: Tokens }, plain?: boolean): CSSProperties => ({
  fontFamily: ctx.t.heading,
  fontWeight: ctx.t.headingWeight ?? 700,
  letterSpacing: ctx.t.headingTracking,
  textTransform: ctx.t.headingCase,
  ...(ctx.t.headingGradient && !plain ? { backgroundImage: ctx.t.headingGradient, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" } : null),
});
const cardStyle = (ctx: { t: Tokens }): CSSProperties => ({ ...ctx.t.card, borderRadius: ctx.t.cardRadius ?? ctx.t.radius });

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
  const { busy, start: startDownload } = useFileDownload();
  const style: CSSProperties = {
    ...(primary ? t.primaryBtn : t.secondaryBtn),
    borderRadius: btnRadius(t),
    ...(t.btnClip ? { clipPath: t.btnClip } : null),
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
  if (cta.action === "download" && href) {
    const onDownload = () => {
      if (preview || busy) return;
      actions.onCta?.(cta);
      void startDownload(href, cta.file_name || "download");
    };
    return (
      <button type="button" onClick={onDownload} aria-busy={busy} disabled={busy} className={`${cls} disabled:cursor-wait`} style={{ ...style, opacity: busy ? 0.85 : undefined }}>
        {busy ? <Loader2 size={17} className="animate-spin" /> : icon}
        {busy ? "Preparing…" : cta.label}
      </button>
    );
  }
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
    <div data-cp-anchor="buttons" className={`flex flex-wrap gap-3 ${block ? "flex-col" : left ? "justify-start" : "justify-center"}`}>
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
      style={{ ...hStyle(ctx, true), color: ctx.t.text }}
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
    <p data-cp-anchor="about" className={`text-[17px] leading-relaxed whitespace-pre-line max-w-2xl ${left ? "text-left" : "text-center mx-auto"}`} style={{ color: ctx.t.text }}>
      {intro}
    </p>
  );
}

function DocumentCard({ ctx }: { ctx: Ctx }) {
  const { busy, start: startDownload } = useFileDownload();
  const doc = ctx.config.document;
  if (!doc?.path) return null;
  const view = publicFileUrl(doc.path);
  const dl = publicFileUrl(doc.path, { download: doc.file_name || `${doc.title || "document"}.pdf` });
  const block = (e: React.MouseEvent) => ctx.preview && e.preventDefault();
  return (
    <div data-cp-anchor="document" className="cp-card p-6 sm:p-8 text-center" style={cardStyle(ctx)}>
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
        <button
          type="button"
          aria-busy={busy}
          disabled={busy}
          onClick={() => {
            if (ctx.preview || busy) return;
            ctx.actions.onDocumentDownload?.();
            void startDownload(dl, doc.file_name || `${doc.title || "document"}.pdf`);
          }}
          className={`cp-btn cp-${ctx.t.fx} inline-flex items-center gap-2 px-6 py-3.5 text-[15px] font-semibold disabled:cursor-wait`}
          style={{ ...ctx.t.secondaryBtn, borderRadius: btnRadius(ctx.t), opacity: busy ? 0.85 : undefined }}
        >
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />} {busy ? "Preparing…" : "Download"}
        </button>
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
      <div data-cp-anchor="gallery" className={wrap}>
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
    <div data-cp-anchor="contact" className="cp-card p-6 sm:p-8" style={cardStyle(ctx)}>
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
        <span className="inline-flex items-center gap-1.5">
          Powered by
          {/* Icon matches the page's own surface: the dark-surface artwork on dark pages, the light one on light pages. */}
          <img
            src={ctx.p.onSecondary === "#FFFFFF" ? "/app_icon_dark_without_tagline.png" : "/app_icon_light_without_tagline.png"}
            alt="Akọ"
            className="h-4 w-auto"
          />
        </span>
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
        {/* Signed-in visitors land here with the app's navigation hidden behind the page — a quiet way back in. */}
        {!ctx.preview && ctx.actions.signedIn && (
          <Link to="/" className="inline-flex items-center gap-1 mt-1 opacity-80 hover:opacity-100" style={{ color: ctx.t.muted }}>
            Open Akọ <ArrowRight size={12} aria-hidden />
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
      <h1 className="mt-3 text-3xl sm:text-5xl font-bold leading-tight drop-shadow" style={hStyle(ctx, true)}>
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
      <h1 className="mt-4 leading-[0.92] drop-shadow-lg break-words" style={{ ...hStyle(ctx, hero.length > 0), fontSize: "clamp(2.75rem, 13vw, 7.5rem)" }}>
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

function Bento({ ctx, slug }: { ctx: Ctx; slug?: string }) {
  const id = ctx.config.identity ?? {};
  const hero = ctx.config.brand?.hero ?? [];
  const hasHero = hero.length > 0;
  const icon = publicFileUrl(id.icon_path);
  const tile = (extra: CSSProperties = {}): CSSProperties => ({ ...cardStyle(ctx), overflow: "hidden", ...extra });
  return (
    <>
      <div className="px-4 pt-8 sm:pt-14 w-full max-w-5xl mx-auto flex flex-col gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 auto-rows-[150px] sm:auto-rows-[190px]">
          <Reveal animation={ctx.animation} index={0} className="col-span-2 row-span-2 sm:col-span-3">
            <div className="cp-card relative h-full w-full flex flex-col justify-end p-6 sm:p-8" style={tile(hasHero ? { color: "#fff" } : { background: ctx.p.accent, color: ctx.p.onAccent, border: "none" })}>
              {hasHero && (
                <>
                  <HeroSlides images={hero} className="absolute inset-0" />
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,.72), rgba(0,0,0,.05) 62%)" }} />
                </>
              )}
              <h1 className="relative leading-[0.98] break-words" style={{ ...hStyle(ctx, true), color: "inherit", fontSize: "clamp(2rem, 7vw, 4rem)" }}>
                {id.name}
              </h1>
            </div>
          </Reveal>
          <Reveal animation={ctx.animation} index={1} className="col-span-1">
            <div className="cp-card h-full w-full flex items-center justify-center" style={tile()}>
              {icon ? <Logo ctx={ctx} size={84} /> : <span className="text-4xl font-bold" style={hStyle(ctx, true)}>{(id.name ?? "•").slice(0, 1)}</span>}
            </div>
          </Reveal>
          <Reveal animation={ctx.animation} index={2} className="col-span-1">
            <div className="cp-card h-full w-full flex items-end p-4" style={tile({ background: ctx.p.primary, color: ctx.p.onPrimary, border: "none" })}>
              <p className="text-[15px] sm:text-base font-semibold leading-snug">{id.tagline || "Welcome"}</p>
            </div>
          </Reveal>
        </div>
        <Reveal animation={ctx.animation} index={3}>
          <div className="cp-card p-6 sm:p-8" style={tile({ overflow: "visible" })}>
            <Intro ctx={ctx} left />
            <div className="mt-6">
              <CtaGroup ctx={ctx} left />
            </div>
          </div>
        </Reveal>
        {(ctx.config.gallery?.length ?? 0) > 0 && (
          <Reveal animation={ctx.animation} index={4}>
            <Gallery ctx={ctx} variant="bento" />
          </Reveal>
        )}
        <div className={`grid gap-3 ${ctx.config.document?.path ? "sm:grid-cols-2" : ""}`}>
          {ctx.config.document?.path && (
            <Reveal animation={ctx.animation} index={5}>
              <DocumentCard ctx={ctx} />
            </Reveal>
          )}
          <Reveal animation={ctx.animation} index={6}>
            <Contact ctx={ctx} />
          </Reveal>
        </div>
      </div>
      <Footer ctx={ctx} slug={slug} />
    </>
  );
}

function Poster({ ctx, slug }: { ctx: Ctx; slug?: string }) {
  const id = ctx.config.identity ?? {};
  const hero = ctx.config.brand?.hero ?? [];
  const word = id.name || "";
  const line = [word, id.tagline || word];
  const strip = (
    <div className="flex items-center shrink-0">
      {[0, 1, 2, 3].map((n) => (
        <span key={n} className="flex items-center whitespace-nowrap" style={{ ...hStyle(ctx, true), fontSize: "clamp(1.6rem, 6vw, 3.2rem)", padding: "0.5rem 0" }}>
          {line.map((t, i) => (
            <span key={i} className="px-5">
              {t} <span className="px-3 opacity-70">✦</span>
            </span>
          ))}
        </span>
      ))}
    </div>
  );
  return (
    <>
      <div className="mt-6 overflow-hidden -rotate-1 scale-[1.04]" style={{ background: ctx.p.accent, color: ctx.p.onAccent }}>
        <div className="cp-marquee">
          {strip}
          {strip}
        </div>
      </div>
      <div className="flex flex-col gap-8 pt-12 sm:pt-16">
        <Section ctx={ctx} i={0} wide>
          <div className="flex flex-col gap-4 items-start text-left">
            <Logo ctx={ctx} size={52} />
            <h1 className="leading-[0.84] break-words w-full" style={{ ...hStyle(ctx), fontSize: "clamp(3.4rem, 19vw, 11rem)" }}>
              {word}
            </h1>
            {id.tagline && (
              <p className="text-xl sm:text-2xl max-w-xl font-medium" style={{ color: ctx.t.muted }}>
                {id.tagline}
              </p>
            )}
          </div>
        </Section>
        {hero.length > 0 && (
          <Section ctx={ctx} i={1} wide>
            <div className="overflow-hidden -rotate-2 sm:mx-10 shadow-2xl" style={{ borderRadius: Math.min(ctx.t.radius + 4, 28) }}>
              <HeroSlides images={hero} className="w-full aspect-[4/3]" />
            </div>
          </Section>
        )}
        <Section ctx={ctx} i={2} wide>
          <div className="flex flex-col gap-6 items-start">
            <Intro ctx={ctx} left />
            <CtaGroup ctx={ctx} left />
          </div>
        </Section>
        {ctx.config.document?.path && (
          <Section ctx={ctx} i={3}>
            <DocumentCard ctx={ctx} />
          </Section>
        )}
        {(ctx.config.gallery?.length ?? 0) > 0 && (
          <Section ctx={ctx} i={4} wide>
            <Gallery ctx={ctx} variant="bento" />
          </Section>
        )}
        <Section ctx={ctx} i={5}>
          <Contact ctx={ctx} />
        </Section>
      </div>
      <Footer ctx={ctx} slug={slug} />
    </>
  );
}

// ── Templates extracted from reference landing pages ────────────────────────────────────────────────────────
// Most share one idea: words on one side, an image in a distinctive shape on the other. Without a hero image the shape
// is filled with the page colours so a template always looks finished in the editor preview.
type LayoutProps = { ctx: Ctx; slug?: string };

/** Splits a name roughly in half so the two halves can be styled differently ("Creative | Marketing Agency"). */
const splitName = (name?: string): [string, string] => {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return [words.join(" "), ""];
  const k = Math.ceil(words.length / 2);
  return [words.slice(0, k).join(" "), words.slice(k).join(" ")];
};

type TitleMode = "plain" | "accent-first" | "accent-second" | "outline-first" | "light-first";

function Title({ ctx, mode = "plain", size }: { ctx: Ctx; mode?: TitleMode; size: string }) {
  const name = ctx.config.identity?.name ?? "";
  const [a, b] = splitName(name);
  if (mode === "plain" || !b) {
    return (
      <h1 className="break-words" style={{ ...hStyle(ctx), fontSize: size, lineHeight: 0.98, margin: 0 }}>
        {name}
      </h1>
    );
  }
  const plain = hStyle(ctx, true);
  const first: CSSProperties =
    mode === "accent-first"
      ? { color: ctx.p.accent }
      : mode === "outline-first"
        ? { color: withAlpha(ctx.t.text, 0.1), WebkitTextStroke: `2px ${ctx.t.text}` }
        : mode === "light-first"
          ? { color: ctx.t.text, fontWeight: 300 }
          : { color: ctx.t.text };
  const second: CSSProperties = mode === "accent-second" ? { color: ctx.p.accent } : mode === "light-first" ? { color: ctx.t.text, fontWeight: 800 } : { color: ctx.t.text };
  return (
    <h1 className="break-words" style={{ fontSize: size, lineHeight: 0.98, margin: 0 }}>
      <span className="block" style={{ ...plain, ...first }}>
        {a}
      </span>
      <span className="block" style={{ ...plain, ...second }}>
        {b}
      </span>
    </h1>
  );
}

/** The hero slideshow, or — when the page has none — a block of the page colours with the name's first letter. */
function Media({ ctx, className = "w-full h-full", slides, filler = true }: { ctx: Ctx; className?: string; slides?: { index: number; onIndexChange: (n: number) => void; dots?: boolean }; filler?: boolean }) {
  const hero = ctx.config.brand?.hero ?? [];
  if (hero.length) return <HeroSlides images={hero} className={className} index={slides?.index} onIndexChange={slides?.onIndexChange} dots={slides?.dots} />;
  if (!filler) return null;
  const initial = (ctx.config.identity?.name ?? "").trim().slice(0, 1).toUpperCase() || "•";
  return (
    <div className={`${className} flex items-center justify-center`} style={{ background: `linear-gradient(135deg, ${ctx.p.accent}, ${ctx.p.primary})`, color: ctx.p.onPrimary }}>
      <span style={{ ...hStyle(ctx, true), fontSize: "clamp(3rem, 14vw, 7rem)", opacity: 0.9 }}>{initial}</span>
    </div>
  );
}

/** A media box that fills an absolutely positioned area; `style` carries the clip / radius that gives the template its shape. */
function Shaped({ ctx, style, className = "", slides, filler }: { ctx: Ctx; style?: CSSProperties; className?: string; slides?: Parameters<typeof Media>[0]["slides"]; filler?: boolean }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} style={style}>
      <Media ctx={ctx} slides={slides} filler={filler} />
    </div>
  );
}

const Wrap = ({ children, className = "" }: { children: ReactNode; className?: string }) => <div className={`px-5 w-full max-w-6xl mx-auto ${className}`}>{children}</div>;

/** What every new template ends with: the document, gallery, contact and the fixed footer. */
function Rest({ ctx, slug }: LayoutProps) {
  return (
    <>
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

/** Logo, title, tagline, intro and buttons — the text half shared by the side-by-side templates. */
function TextCol({ ctx, mode, size = "clamp(2.6rem, 8vw, 4.8rem)", order = "sm:order-1", children }: { ctx: Ctx; mode?: TitleMode; size?: string; order?: string; children?: ReactNode }) {
  const id = ctx.config.identity ?? {};
  return (
    <Reveal animation={ctx.animation} index={1} className={`${order} relative flex flex-col gap-5 items-start text-left`}>
      <Logo ctx={ctx} size={56} />
      <Title ctx={ctx} mode={mode} size={size} />
      {children}
      {id.tagline && (
        <p className="text-lg sm:text-xl max-w-md" style={{ color: ctx.t.muted }}>
          {id.tagline}
        </p>
      )}
      <Intro ctx={ctx} left />
      <CtaGroup ctx={ctx} left />
    </Reveal>
  );
}

const SideGrid = ({ children, cols = "sm:grid-cols-2" }: { children: ReactNode; cols?: string }) => (
  <Wrap className="pt-10 sm:pt-16">
    <div className={`grid gap-8 sm:gap-12 items-center ${cols}`}>{children}</div>
  </Wrap>
);

// Console: big headline, image bleeding off the right edge, ghost outline of the name behind it.
function Console({ ctx, slug }: LayoutProps) {
  const id = ctx.config.identity ?? {};
  return (
    <>
      <SideGrid cols="sm:grid-cols-[1.05fr_1fr]">
        <Reveal animation={ctx.animation} index={0} className="sm:order-2 sm:-mr-5 cp-mask-l">
          <div className="relative aspect-[4/5] sm:aspect-[5/6]">
            <Shaped ctx={ctx} />
          </div>
        </Reveal>
        <div className="sm:order-1 relative">
          {id.name && (
            <span aria-hidden className="hidden sm:block absolute -top-[4.5rem] left-0 select-none pointer-events-none whitespace-nowrap" style={{ ...hStyle(ctx, true), fontSize: "clamp(3.5rem, 9vw, 7rem)", lineHeight: 1, color: "transparent", WebkitTextStroke: `1px ${withAlpha(ctx.t.text, 0.2)}` }}>
              {id.name}
            </span>
          )}
          <TextCol ctx={ctx} mode="accent-second" size="clamp(2.6rem, 8.4vw, 5rem)" order="" />
        </div>
      </SideGrid>
      <Rest ctx={ctx} slug={slug} />
    </>
  );
}

// Showreel: full-bleed hero, words over it, and a floating white card with Previous / Next for the hero images.
function Showreel({ ctx, slug }: LayoutProps) {
  const id = ctx.config.identity ?? {};
  const hero = ctx.config.brand?.hero ?? [];
  const n = hero.length;
  const [i, setI] = useState(0);
  const next = n ? hero[(i + 1) % n] : null;
  const first = (ctx.config.ctas ?? []).find((c) => c.label.trim());
  const words = (
    <div className="absolute inset-0 flex flex-col justify-center items-start gap-4 px-6 sm:px-14 pb-28 sm:pb-32 text-white" style={{ background: "linear-gradient(90deg, rgba(0,0,0,.72), rgba(0,0,0,.15) 70%)" }}>
      <Logo ctx={ctx} size={48} />
      <h1 className="break-words max-w-2xl" style={{ ...hStyle(ctx, true), fontSize: "clamp(2.4rem, 8vw, 4.8rem)", lineHeight: 1, color: ctx.style === "noir" ? ctx.p.accent : "#fff" }}>
        {id.name}
      </h1>
      {id.intro && <p className="max-w-md text-[15px] sm:text-base text-white/85 line-clamp-4">{id.intro}</p>}
      {first && <CtaButton cta={first} primary ctx={ctx} />}
    </div>
  );
  return (
    <>
      {n ? (
        <HeroSlides images={hero} className="w-full aspect-[4/5] sm:aspect-auto sm:h-[640px]" overlay={words} index={i} onIndexChange={setI} dots={false} />
      ) : (
        <div className="relative w-full aspect-[4/5] sm:aspect-auto sm:h-[640px]" style={{ background: `linear-gradient(135deg, ${ctx.p.primary}, ${ctx.p.accent})` }}>
          {words}
        </div>
      )}
      <div className="relative z-[1] -mt-24 mx-5 sm:ml-14 max-w-sm px-5 pb-5 pt-5 shadow-2xl" style={{ background: "#FFFFFF", color: "#14120F" }}>
        <div className="flex items-start gap-4">
          <div className="relative shrink-0 -mt-12 w-20 h-24 overflow-hidden" style={{ clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))", background: ctx.p.accent }}>
            {next ? <img src={publicFileUrl(next.path) ?? ""} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <Logo ctx={ctx} size={80} />}
          </div>
          <p className="text-lg font-semibold leading-tight pt-1">{id.tagline || id.name}</p>
        </div>
        {id.intro && <p className="mt-3 text-sm leading-relaxed text-neutral-600 line-clamp-3">{id.intro}</p>}
        {n > 1 && (
          <div className="mt-4 flex gap-6 text-sm font-semibold">
            <button type="button" onClick={() => setI((i + n - 1) % n)} className="hover:opacity-70">
              Previous
            </button>
            <button type="button" onClick={() => setI((i + 1) % n)} className="hover:opacity-70">
              Next
            </button>
          </div>
        )}
      </div>
      <Rest ctx={ctx} slug={slug} />
    </>
  );
}

// Frame: a rounded window with a small intro line, giant title, centred image and arrows at the side.
function Frame({ ctx, slug }: LayoutProps) {
  const id = ctx.config.identity ?? {};
  const hero = ctx.config.brand?.hero ?? [];
  const n = hero.length;
  const [i, setI] = useState(0);
  const ctas = (ctx.config.ctas ?? []).filter((c) => c.label.trim());
  const arrow = "w-10 h-10 rounded-full inline-flex items-center justify-center hover:opacity-70";
  return (
    <>
      <div className="px-4 sm:px-8 pt-6 sm:pt-10">
        <div className="relative overflow-hidden mx-auto max-w-6xl" style={{ borderRadius: 32, border: `1px solid ${ctx.t.rule}`, background: withAlpha(ctx.t.text, 0.03) }}>
          <div className="grid gap-6 sm:grid-cols-[1fr_minmax(250px,0.8fr)_minmax(160px,0.5fr)] items-end px-6 sm:px-10 pt-10 sm:pt-16">
            <Reveal animation={ctx.animation} index={1} className="sm:order-1 flex flex-col gap-4 items-start text-left sm:pb-14">
              {id.tagline && (
                <p className="text-sm sm:text-base uppercase tracking-[0.18em]" style={{ color: ctx.t.muted }}>
                  {id.tagline}
                </p>
              )}
              <Title ctx={ctx} size="clamp(2.8rem, 7vw, 5rem)" />
              <Intro ctx={ctx} left />
              {ctas[0] && <CtaButton cta={ctas[0]} primary ctx={ctx} />}
            </Reveal>
            <Reveal animation={ctx.animation} index={0} className="sm:order-2">
              <div className="relative aspect-[3/4] sm:-mx-4">
                <Shaped ctx={ctx} slides={n ? { index: i, onIndexChange: setI, dots: false } : undefined} style={{ borderRadius: "28px 28px 0 0" }} />
              </div>
            </Reveal>
            <Reveal animation={ctx.animation} index={2} className="sm:order-3 flex flex-col gap-5 items-start pb-10 sm:pb-16">
              {ctas.slice(1, 3).map((c) => (
                <CtaButton key={c.id} cta={c} primary={false} ctx={ctx} />
              ))}
              {n > 1 && (
                <div className="flex gap-3" style={{ color: ctx.t.text }}>
                  <button type="button" aria-label="Previous image" onClick={() => setI((i + n - 1) % n)} className={arrow} style={{ border: `1px solid ${ctx.t.rule}` }}>
                    <ArrowLeft size={18} />
                  </button>
                  <button type="button" aria-label="Next image" onClick={() => setI((i + 1) % n)} className={arrow} style={{ border: `1px solid ${ctx.t.rule}` }}>
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </Reveal>
          </div>
        </div>
      </div>
      <Rest ctx={ctx} slug={slug} />
    </>
  );
}

// Duo: a light half with the words, a dark half with a tilted device-style image and a vertical contact rail.
function Duo({ ctx, slug }: LayoutProps) {
  const c = ctx.config.contact ?? {};
  const rail = [c.email && { label: c.email, href: `mailto:${c.email}` }, c.phone && { label: c.phone, href: `tel:${c.phone.replace(/[^\d+]/g, "")}` }, c.address && { label: c.address, href: undefined as string | undefined }].filter(Boolean) as { label: string; href?: string }[];
  return (
    <>
      <div className="grid sm:grid-cols-[1.1fr_1fr] sm:min-h-[80svh]">
        <div className="px-6 sm:px-12 py-12 flex items-center">
          <TextCol ctx={ctx} size="clamp(2.4rem, 7.5vw, 4.4rem)" order="" />
        </div>
        <div className="relative overflow-hidden flex items-center justify-center px-6 py-14 text-white" style={{ background: "radial-gradient(60% 50% at 50% 40%, #1d1d21, #060607)" }}>
          <div className="relative w-[min(58%,250px)] aspect-[9/17] rotate-[8deg] overflow-hidden shadow-2xl" style={{ borderRadius: 34, border: "6px solid #1c1c1e" }}>
            <Media ctx={ctx} className="absolute inset-0 w-full h-full" />
          </div>
          {rail.length > 0 && (
            <div className="hidden sm:flex absolute right-6 top-1/2 -translate-y-1/2 gap-5 text-[11px] uppercase tracking-[0.2em] text-white/70 whitespace-nowrap" style={{ writingMode: "vertical-rl" }}>
              {rail.map((r) =>
                r.href ? (
                  <a key={r.label} href={r.href} onClick={(e) => ctx.preview && e.preventDefault()} className="hover:text-white">
                    {r.label}
                  </a>
                ) : (
                  <span key={r.label}>{r.label}</span>
                ),
              )}
            </div>
          )}
        </div>
      </div>
      <Rest ctx={ctx} slug={slug} />
    </>
  );
}

// Portrait: outlined first half of the title, solid second half, and a round image on a tinted panel.
function Portrait({ ctx, slug }: LayoutProps) {
  return (
    <>
      <SideGrid>
        <TextCol ctx={ctx} mode="outline-first" size="clamp(2.6rem, 9vw, 4.8rem)">
          <div aria-hidden style={{ width: 120, height: 3, background: ctx.p.accent }} />
        </TextCol>
        <Reveal animation={ctx.animation} index={0} className="sm:order-2">
          <div className="relative p-8 sm:p-10" style={{ borderRadius: 28, background: withAlpha(ctx.t.text, 0.06) }}>
            <svg aria-hidden className="absolute top-3 right-3 opacity-40" width="90" height="90" viewBox="0 0 90 90" fill="none" stroke={ctx.t.text} strokeWidth="1.2">
              <path d="M10 80C30 60 40 40 70 10M30 62c-6-4-9-10-8-17 7 1 12 5 14 11M44 46c-5-5-6-12-4-18 6 3 10 8 11 14M58 30c-3-5-3-11 0-16 5 3 7 8 7 13" />
            </svg>
            <div className="relative mx-auto aspect-square w-full max-w-[340px]">
              <div aria-hidden className="absolute -right-3 top-[52%] w-9 h-14" style={{ background: ctx.p.accent }} />
              <Shaped ctx={ctx} style={{ borderRadius: "50%" }} />
            </div>
          </div>
        </Reveal>
      </SideGrid>
      <Rest ctx={ctx} slug={slug} />
    </>
  );
}

// Arch: a monogram, a serif title, and an arch-shaped image with playful pastel shapes around it.
function Arch({ ctx, slug }: LayoutProps) {
  const initial = (ctx.config.identity?.name ?? "").trim().slice(0, 1).toLowerCase();
  return (
    <>
      <SideGrid>
        <TextCol ctx={ctx} size="clamp(2.8rem, 9vw, 5.2rem)">
          {initial && (
            <span aria-hidden className="inline-flex items-center justify-center w-12 h-12 rounded-full text-xl" style={{ ...hStyle(ctx, true), border: `1.5px solid ${ctx.t.text}` }}>
              {initial}.
            </span>
          )}
        </TextCol>
        <Reveal animation={ctx.animation} index={0} className="sm:order-2">
          <div className="relative p-8 sm:p-10 overflow-hidden" style={{ borderRadius: 28, background: withAlpha(ctx.p.accent, 0.1) }}>
            <span aria-hidden className="absolute left-5 top-5 w-7 h-7 rounded-full" style={{ background: "#BFE3D6" }} />
            <span aria-hidden className="absolute right-6 top-8 w-9 h-9 rotate-12" style={{ background: "repeating-linear-gradient(135deg, #F2B9B2 0 4px, #fff 4px 8px)" }} />
            <span aria-hidden className="absolute left-4 bottom-10 w-12 h-5 rounded-full" style={{ background: ctx.p.accent }} />
            <span aria-hidden className="absolute right-6 bottom-12 w-6 h-6 rotate-45" style={{ background: "#A3AB98" }} />
            <span aria-hidden className="absolute right-4 top-1/2 w-8 h-8 rounded-full" style={{ border: `5px solid ${ctx.p.accent}` }} />
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[300px]">
              <Shaped ctx={ctx} style={{ borderRadius: "999px 999px 22px 22px" }} />
            </div>
          </div>
        </Reveal>
      </SideGrid>
      <Rest ctx={ctx} slug={slug} />
    </>
  );
}

// Banner: a light-then-heavy statement and a round image on a white disc with floating accents.
function Banner({ ctx, slug }: LayoutProps) {
  return (
    <>
      <SideGrid cols="sm:grid-cols-[1.1fr_1fr]">
        <TextCol ctx={ctx} mode="light-first" size="clamp(2.6rem, 8.6vw, 5rem)" />
        <Reveal animation={ctx.animation} index={0} className="sm:order-2">
          <div className="relative mx-auto aspect-square w-full max-w-[420px] rounded-full p-[7%]" style={{ background: "rgba(255,255,255,0.85)", boxShadow: "0 30px 60px -30px rgba(0,0,0,.25)" }}>
            <div className="relative w-full h-full">
              <Shaped ctx={ctx} style={{ borderRadius: "50%" }} />
            </div>
            <span aria-hidden className="absolute -left-2 top-[18%] w-12 h-12 rounded-2xl flex items-center justify-center text-xl cp-float" style={{ background: ctx.p.accent, color: ctx.p.onAccent }}>
              ✦
            </span>
            <span aria-hidden className="absolute right-0 bottom-[14%] w-20 h-9 rounded-xl bg-white shadow-lg flex items-center px-2.5 cp-float">
              <span className="h-2.5 rounded-full w-full" style={{ background: `linear-gradient(90deg, ${ctx.p.primary} 90%, ${withAlpha(ctx.p.primary, 0.2)} 90%)` }} />
            </span>
          </div>
        </Reveal>
      </SideGrid>
      <Rest ctx={ctx} slug={slug} />
    </>
  );
}

// Diagonal: the image is cut on a slant with layered colour blades, like an agency cover.
function Diagonal({ ctx, slug }: LayoutProps) {
  return (
    <>
      <SideGrid cols="sm:grid-cols-[1fr_1.1fr]">
        <TextCol ctx={ctx} mode="accent-first" size="clamp(2.6rem, 8.4vw, 4.8rem)" />
        <Reveal animation={ctx.animation} index={0} className="sm:order-2">
          <div className="relative aspect-[4/3] sm:aspect-[5/4] sm:-mr-5">
            <div aria-hidden className="absolute inset-0" style={{ background: withAlpha(ctx.p.primary, 0.55), clipPath: "polygon(8% 0, 26% 0, 8% 100%, 0 100%)" }} />
            <div aria-hidden className="absolute inset-0" style={{ background: ctx.p.accent, clipPath: "polygon(16% 0, 22% 0, 4% 100%, 0 100%)", opacity: 0.9 }} />
            <Shaped ctx={ctx} style={{ clipPath: "polygon(26% 0, 100% 0, 100% 100%, 8% 100%)" }} />
          </div>
        </Reveal>
      </SideGrid>
      <Rest ctx={ctx} slug={slug} />
    </>
  );
}

// Wave: a two-tone title and an image set in flowing, layered waves.
function Wave({ ctx, slug }: LayoutProps) {
  return (
    <>
      <SideGrid>
        <TextCol ctx={ctx} mode="accent-second" size="clamp(2.6rem, 8.6vw, 4.8rem)">
          <div aria-hidden style={{ width: 84, height: 4, borderRadius: 4, background: ctx.p.accent }} />
        </TextCol>
        <Reveal animation={ctx.animation} index={0} className="sm:order-2">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[420px]">
            <div aria-hidden className="absolute inset-0 -rotate-6" style={{ background: withAlpha(ctx.p.accent, 0.4), borderRadius: "58% 42% 50% 50% / 38% 56% 44% 62%" }} />
            <div aria-hidden className="absolute inset-[4%] rotate-3" style={{ background: withAlpha(ctx.p.primary, 0.55), borderRadius: "42% 58% 46% 54% / 52% 38% 62% 48%" }} />
            <div className="absolute inset-[9%]">
              <Shaped ctx={ctx} style={{ borderRadius: "46% 54% 42% 58% / 52% 40% 60% 48%" }} />
            </div>
          </div>
        </Reveal>
      </SideGrid>
      <Rest ctx={ctx} slug={slug} />
    </>
  );
}

// Diamond: the image sits in a tilted diamond frame with bold angled colour blocks behind it.
function Diamond({ ctx, slug }: LayoutProps) {
  return (
    <>
      <SideGrid>
        <TextCol ctx={ctx} size="clamp(2.6rem, 8.4vw, 4.8rem)" />
        <Reveal animation={ctx.animation} index={0} className="sm:order-2">
          <div className="relative mx-auto aspect-square w-full max-w-[440px]">
            <div aria-hidden className="absolute inset-y-0 right-0 w-[30%]" style={{ background: ctx.p.primary, clipPath: "polygon(34% 0, 100% 0, 100% 100%, 0 100%)" }} />
            <div aria-hidden className="absolute bottom-0 right-[8%] w-[46%] h-[30%]" style={{ background: withAlpha(ctx.t.text, 0.1), clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
            <div className="absolute inset-[15%] rotate-45">
              <div aria-hidden className="absolute -left-3 -top-3 right-3 bottom-3" style={{ border: `6px solid ${ctx.p.primary}` }} />
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 -rotate-45 scale-[1.5]">
                  <Media ctx={ctx} />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </SideGrid>
      <Rest ctx={ctx} slug={slug} />
    </>
  );
}

// Float: a soft floating image circled by glossy spheres. With no image, the spheres carry the page on their own.
function Float({ ctx, slug }: LayoutProps) {
  const hasHero = (ctx.config.brand?.hero?.length ?? 0) > 0;
  const orb = (c1: string, c2: string, size: number, pos: CSSProperties, delay = 0): ReactNode => (
    <span aria-hidden className="absolute rounded-full cp-float" style={{ width: size, height: size, background: `radial-gradient(circle at 30% 26%, rgba(255,255,255,.95) 0, rgba(255,255,255,0) 24%), radial-gradient(circle at 50% 50%, ${c1}, ${c2})`, boxShadow: `0 18px 30px -14px ${withAlpha(c2, 0.7)}`, animationDelay: `${delay}s`, ...pos }} />
  );
  return (
    <>
      <SideGrid>
        <TextCol ctx={ctx} mode="accent-first" size="clamp(2.6rem, 8.6vw, 4.8rem)" />
        <Reveal animation={ctx.animation} index={0} className="sm:order-2">
          <div className="relative mx-auto aspect-square w-full max-w-[460px]">
            {hasHero && (
              <div className="absolute inset-[10%] rotate-3" style={{ boxShadow: "0 40px 60px -30px rgba(0,0,0,.45)", borderRadius: 36 }}>
                <Shaped ctx={ctx} style={{ borderRadius: 36 }} />
              </div>
            )}
            {orb(ctx.p.accent, ctx.p.primary, hasHero ? 84 : 150, hasHero ? { left: "-2%", top: "6%" } : { left: "8%", top: "14%" })}
            {orb("#9BE8DA", "#2BB5A3", hasHero ? 56 : 110, hasHero ? { right: "2%", top: "-2%" } : { right: "8%", top: "6%" }, 0.8)}
            {orb("#FFC2DD", "#E0679E", hasHero ? 100 : 130, hasHero ? { right: "-4%", bottom: "4%" } : { right: "14%", bottom: "8%" }, 1.6)}
            {orb("#C9C6FF", "#6B67E8", hasHero ? 40 : 70, hasHero ? { left: "10%", bottom: "-2%" } : { left: "22%", bottom: "4%" }, 2.4)}
          </div>
        </Reveal>
      </SideGrid>
      <Rest ctx={ctx} slug={slug} />
    </>
  );
}

// ── Share button ────────────────────────────────────────────────────────────────────────────────────────────
// Optional, creator-controlled (config.share). The creator picks a position and a look; the template decides the exact
// spot so the button stays where a visitor would look for it and never lands on the title or logo.
//  · top-left / top-right: a corner at the top of the page, offset per template (the poster sits under its banner).
//  · bottom-left / bottom-right: floats just above the bottom edge and follows the visitor as they scroll.
//  · center: horizontally centred, in whichever of top or bottom is clear in that template.
// Uses the phone's share sheet where there is one and falls back to copying the link.

/** The share glyph (traced from the supplied artwork). Fills with the current text colour. */
function ShareIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="97 97 360 360" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M105.6 449.2C140 373.4 197.2 329.9 271.2 323.4L279 322.8L279.2 365.5C279.5 403.7 279.7 408.4 281.1 409.3C282.6 410.2 305.5 390.8 340.5 358.9C342.7 356.9 364.1 337.8 388 316.5C455.2 256.5 457 254.9 457 253.6C457 252.9 438.2 235.5 415.3 214.9C392.3 194.3 370.8 175 367.5 172C364.1 169 353.3 159.3 343.5 150.4C333.6 141.6 316.1 125.9 304.7 115.6C291.7 104 283.2 97 282.2 97.2C280.6 97.5 280.5 101.1 280.2 139.7L280 181.9L275.7 182.4C273.4 182.7 268.8 183.2 265.5 183.5C246.7 185.4 226.1 191.4 207.5 200.5C148 229.4 110.2 292.3 99.3 380.5C97.5 395.3 96.8 448.7 98.3 454.2C99.6 459 101.9 457.5 105.6 449.2Z" />
    </svg>
  );
}

const SHARE_PLACEMENT: Record<TemplateId, { top: string; media?: boolean; center: "top" | "bottom" }> = {
  // Full-bleed hero first: the top floats over the picture and the title sits low, so top-centre is clear.
  showcase: { top: "14px", media: true, center: "top" },
  spotlight: { top: "14px", media: true, center: "top" },
  // A centred logo and title start right under the top edge, so a centred button goes to the bottom instead.
  stacked: { top: "14px", center: "bottom" },
  brochure: { top: "14px", center: "bottom" },
  linkcard: { top: "14px", center: "bottom" },
  // Left-aligned headers leave the top edge clear.
  split: { top: "14px", center: "top" },
  portfolio: { top: "14px", center: "top" },
  bento: { top: "14px", center: "top" },
  // Poster opens with the scrolling banner, so the button sits just beneath it, clear of the headline.
  poster: { top: "calc(1.5rem + 1.2 * clamp(1.6rem, 6vw, 3.2rem) + 1rem + 18px)", center: "top" },
  // New side-by-side templates open with a text column, so the top edge is clear.
  console: { top: "14px", center: "top" },
  showreel: { top: "14px", media: true, center: "top" },
  frame: { top: "22px", center: "top" },
  duo: { top: "14px", center: "top" },
  portrait: { top: "14px", center: "top" },
  arch: { top: "14px", center: "top" },
  banner: { top: "14px", center: "top" },
  diagonal: { top: "14px", center: "top" },
  wave: { top: "14px", center: "top" },
  diamond: { top: "14px", center: "top" },
  float: { top: "14px", center: "top" },
};

function ShareButton({ ctx, slug }: { ctx: Ctx; slug?: string }) {
  const { look, position } = resolveShare(ctx.config);
  const template = resolveDesign(ctx.config).template;
  const place = SHARE_PLACEMENT[template];
  const edge: "top" | "bottom" = position === "center" ? place.center : position.startsWith("bottom") ? "bottom" : "top";
  const side: "left" | "right" | "center" = position === "center" ? "center" : position.endsWith("left") ? "left" : "right";
  const floating = edge === "bottom";
  const onMedia = !floating && !!place.media && (ctx.config.brand?.hero?.length ?? 0) > 0;
  const [copied, setCopied] = useState(false);
  const name = ctx.config.identity?.name?.trim() || "this page";

  const run = async () => {
    if (ctx.preview) return;
    ctx.actions.onShare?.();
    const url = slug ? customPageUrl(slug) : window.location.href;
    const text = ctx.config.identity?.tagline?.trim() || undefined;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: name, text, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return; // they closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  const size = 44;
  const text = ctx.t.text;
  let style: CSSProperties;
  let label: string | null = null;
  if (look === "minimal") {
    style = { width: size, height: size, borderRadius: 999, color: onMedia ? "#fff" : text, background: "transparent", filter: onMedia ? "drop-shadow(0 1px 3px rgba(0,0,0,.55))" : floating ? "drop-shadow(0 1px 4px rgba(0,0,0,.35))" : undefined };
  } else if (look === "round") {
    // Floating over unknown content needs a surface that reads on anything, so it gets the dark glass chip too.
    style = onMedia || floating
      ? { width: size, height: size, borderRadius: 999, color: "#fff", background: "rgba(0,0,0,.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", boxShadow: floating ? "0 6px 18px rgba(0,0,0,.25)" : undefined }
      : { width: size, height: size, borderRadius: 999, color: text, background: withAlpha(text, 0.1) };
  } else if (look === "pill") {
    label = "Share";
    style = { ...ctx.t.secondaryBtn, height: size, padding: "0 16px", borderRadius: 999, gap: 8, fontSize: 14, fontWeight: 600, letterSpacing: "normal", textTransform: "none" };
  } else {
    // auto — the page style's own secondary button, squared into a chip, with its own corner radius.
    style = { ...ctx.t.secondaryBtn, width: size, height: size, padding: 0, borderRadius: btnRadius(ctx.t) };
  }

  const horizontal: CSSProperties = side === "left" ? { left: 14 } : side === "right" ? { right: 14 } : { left: "50%", transform: "translateX(-50%)" };
  const toastPos = floating ? "bottom-full mb-2" : "top-full mt-2";
  const toastSide = side === "left" ? "left-0" : side === "right" ? "right-0" : "left-1/2 -translate-x-1/2";

  const button = (
    <>
      <button
        type="button"
        onClick={() => void run()}
        aria-label="Share this page"
        className={`cp-btn ${look === "auto" || look === "pill" ? `cp-${ctx.t.fx}` : ""} inline-flex items-center justify-center`}
        style={style}
      >
        <ShareIcon size={look === "minimal" ? 22 : 18} />
        {label}
      </button>
      {copied && (
        <span role="status" className={`absolute ${toastSide} ${toastPos} whitespace-nowrap rounded-full bg-black/80 text-white text-xs px-3 py-1.5`}>
          Link copied
        </span>
      )}
    </>
  );

  if (!floating) {
    return (
      <div className="absolute z-10" style={{ top: `calc(env(safe-area-inset-top, 0px) + ${ctx.navInset.top}px + ${place.top})`, ...horizontal }}>
        {button}
      </div>
    );
  }
  // Zero-height sticky rail at the end of the page: the button rides the bottom edge of whatever is scrolling.
  return (
    <div className="sticky z-10 pointer-events-none" style={{ bottom: 0, height: 0 }}>
      <div className="absolute pointer-events-auto" style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${ctx.navInset.bottom}px + 18px)`, ...horizontal }}>
        {button}
      </div>
    </div>
  );
}

// ── Background, foreground and menu ─────────────────────────────────────────────────────────────────────────────
const NAV_BAR_H = 48;
const NAV_PILL_H = 64;

/** The page's background picture. A zero-height sticky rail holds it, so it stays put while the content scrolls over it. */
function BackgroundLayer({ ctx }: { ctx: Ctx }) {
  const bg = resolveBackground(ctx.config);
  const url = bg ? publicFileUrl(bg.path) : null;
  if (!bg || !url) return null;
  const look = LOOK_CSS[bg.look];
  // The veil is the opposite of the text colour, so text always has something to read against.
  const veilColor = isHex(ctx.t.text) ? readableOn(ctx.t.text) : "#14120F";
  const size = bg.fit === "stretch" ? "100% 100%" : bg.fit === "tile" ? "auto" : "cover";
  return (
    <div className="sticky top-0 pointer-events-none" style={{ height: 0, zIndex: -1 }} aria-hidden="true">
      <div className="cp-bg absolute left-0 top-0 w-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("${url}")`,
            backgroundSize: size,
            backgroundRepeat: bg.fit === "tile" ? "repeat" : "no-repeat",
            backgroundPosition: "center",
            filter: look.filter,
            transform: bg.zoom !== 1 ? `scale(${bg.zoom})` : undefined,
          }}
        />
        <div className="absolute inset-0" style={{ background: withAlpha(veilColor, look.veil) }} />
      </div>
    </div>
  );
}

/**
 * The picture laid over the top of the page. It lives in a "stage" the width of the first screen, so x / y / size are
 * percentages that mean the same thing on every device. Shadow and rotation sit on separate elements on purpose: the
 * shadow filter is on the outer one, so it keeps falling in the chosen direction however the picture is turned.
 */
export function ForegroundArt({ fg, url }: { fg: ResolvedForeground; url: string }) {
  const shadow = fg.shadow.enabled ? shadowGeometry(fg.shadow.intensity, fg.shadow.angle) : null;
  const clipped = !!fg.shape;
  const mask = fg.shape ? shapeMaskUrl(fg.shape.path) : undefined;
  return (
    <div
      className="absolute"
      style={{
        left: `${fg.x}%`,
        top: `${fg.y}%`,
        width: `${fg.size}%`,
        transform: "translate(-50%, -50%)",
        filter: shadow ? `drop-shadow(${shadow.dx}px ${shadow.dy}px ${shadow.blur}px rgba(0,0,0,${shadow.alpha}))` : undefined,
      }}
    >
      <div
        style={{
          transform: fg.rotation ? `rotate(${fg.rotation}deg)` : undefined,
          aspectRatio: fg.shape ? String(fg.shape.aspect) : undefined,
          overflow: clipped ? "hidden" : undefined,
          WebkitMaskImage: mask,
          maskImage: mask,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
        }}
      >
        <img
          src={url}
          alt=""
          draggable={false}
          style={{
            display: "block",
            width: "100%",
            height: clipped ? "100%" : "auto",
            objectFit: clipped ? "cover" : undefined,
            objectPosition: clipped ? `${fg.crop.x}% ${fg.crop.y}%` : undefined,
            transform: clipped && fg.crop.zoom !== 1 ? `scale(${fg.crop.zoom})` : undefined,
            transformOrigin: clipped ? `${fg.crop.x}% ${fg.crop.y}%` : undefined,
          }}
        />
      </div>
    </div>
  );
}

function ForegroundLayer({ ctx }: { ctx: Ctx }) {
  const fg = resolveForeground(ctx.config);
  const url = fg ? publicFileUrl(fg.path) : null;
  if (!fg || !url) return null;
  return (
    <div className="absolute top-0 left-1/2 w-full pointer-events-none" style={{ maxWidth: 640, transform: "translateX(-50%)", aspectRatio: "4 / 5", zIndex: 6 }} aria-hidden="true">
      <ForegroundArt fg={fg} url={url} />
    </div>
  );
}

/** The page menu. Each item scrolls to a section with the animation the creator chose. */
function NavBar({ ctx, rootRef }: { ctx: Ctx; rootRef: React.RefObject<HTMLDivElement | null> }) {
  const nav = resolveNav(ctx.config);
  const available = availableNavTargets(ctx.config);
  const items = nav.items.filter((i) => available.includes(i.target));
  const [active, setActive] = useState<string | null>(null);
  const top = nav.position === "top";
  const height = nav.look === "pill" ? NAV_PILL_H : NAV_BAR_H;
  const offset = top ? height + 8 : 12;

  const anchorOf = (target: string): HTMLElement | null =>
    target === "top" ? rootRef.current : (rootRef.current?.querySelector<HTMLElement>(`[data-cp-anchor="${target}"]`) ?? null);

  // Scroll-spy: highlight the last section whose top has passed the menu.
  const key = items.map((i) => i.id + i.target).join("|");
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !items.length) return;
    const scroller = findScroller(root);
    const holder: EventTarget = scroller ?? window;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const viewTop = scroller ? scroller.getBoundingClientRect().top : 0;
      let current: string | null = null;
      for (const item of items) {
        if (item.target === "top") {
          current = current ?? item.id;
          continue;
        }
        const el = anchorOf(item.target);
        if (el && el.getBoundingClientRect().top - viewTop <= offset + 24) current = item.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    holder.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => {
      holder.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, offset]);

  if (!items.length) return null;

  const go = (id: string, target: string) => {
    const el = anchorOf(target);
    if (!el) return;
    setActive(id);
    scrollToElement(el, { animation: nav.scroll, offset: target === "top" ? 0 : offset });
  };

  const surface = withAlpha(isHex(ctx.t.text) ? readableOn(ctx.t.text) : "#FFFFFF", 0.86);
  const pill = nav.look === "pill";
  const list = (
    <nav
      aria-label="Page menu"
      className="no-scrollbar flex items-center overflow-x-auto"
      style={{
        height: pill ? 44 : NAV_BAR_H,
        maxWidth: "100%",
        gap: 4,
        padding: pill ? "0 6px" : "0 12px",
        justifyContent: pill ? "flex-start" : "center",
        background: surface,
        backdropFilter: "blur(14px) saturate(1.4)",
        WebkitBackdropFilter: "blur(14px) saturate(1.4)",
        borderRadius: pill ? 999 : 0,
        border: pill ? `1px solid ${ctx.t.rule}` : undefined,
        borderBottom: pill ? undefined : top ? `1px solid ${ctx.t.rule}` : undefined,
        borderTop: pill ? undefined : top ? undefined : `1px solid ${ctx.t.rule}`,
        boxShadow: pill ? "0 10px 28px -12px rgba(0,0,0,.35)" : undefined,
      }}
    >
      {items.map((item) => {
        const on = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => go(item.id, item.target)}
            aria-current={on ? "true" : undefined}
            className="cp-btn shrink-0 whitespace-nowrap text-[14px] font-semibold px-3.5"
            style={{
              height: pill ? 34 : NAV_BAR_H,
              borderRadius: pill ? 999 : 0,
              color: on && pill ? ctx.p.onAccent : ctx.t.text,
              background: on && pill ? ctx.p.accent : "transparent",
              opacity: on || pill ? 1 : 0.72,
              boxShadow: on && !pill ? `inset 0 ${top ? -3 : 3}px 0 ${ctx.p.accent}` : undefined,
              fontFamily: ctx.t.heading,
              fontWeight: on ? 700 : 600,
            }}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  if (top) {
    return (
      <div className="sticky top-0 flex justify-center" style={{ zIndex: 20, paddingTop: "env(safe-area-inset-top, 0px)", ...(pill ? { padding: "10px 12px 10px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)", pointerEvents: "none" } : null) }}>
        <div style={{ pointerEvents: "auto", maxWidth: "100%", width: pill ? undefined : "100%" }}>{list}</div>
      </div>
    );
  }
  // Bottom: a zero-height sticky rail at the end of the page, like the floating share button.
  return (
    <div className="sticky pointer-events-none" style={{ bottom: 0, height: 0, zIndex: 20 }}>
      <div className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ bottom: pill ? "calc(env(safe-area-inset-bottom, 0px) + 12px)" : 0, paddingBottom: pill ? 0 : "env(safe-area-inset-bottom, 0px)", background: pill ? undefined : surface }}>
        <div style={{ pointerEvents: "auto", maxWidth: "100%", width: pill ? undefined : "100%" }}>{list}</div>
      </div>
    </div>
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
  bento: Bento,
  poster: Poster,
  console: Console,
  showreel: Showreel,
  frame: Frame,
  duo: Duo,
  portrait: Portrait,
  arch: Arch,
  banner: Banner,
  diagonal: Diagonal,
  wave: Wave,
  diamond: Diamond,
  float: Float,
};

export function CustomPageRenderer({ config, preview = false, actions = {}, slug }: Props) {
  const { style, template, animation } = resolveDesign(config);
  const p = resolvePalette(config);
  const t = styleTokens(style, p);
  const nav = resolveNav(config);
  const hasNav = nav.enabled && nav.items.some((i) => availableNavTargets(config).includes(i.target));
  const navH = nav.look === "pill" ? NAV_PILL_H : NAV_BAR_H;
  const navInset = { top: hasNav && nav.position === "top" ? navH : 0, bottom: hasNav && nav.position === "bottom" ? navH + 12 : 0 };
  const ctx: Ctx = { config, p, t, style, animation, preview, actions, navInset };
  const Layout = LAYOUTS[template];
  const rootRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={rootRef}
      className={`cp-root relative isolate min-h-full w-full overflow-x-hidden overflow-x-clip ${t.drift ? "cp-drift" : ""} ${t.grain ? "cp-grain" : ""}`}
      style={{ ...t.pageStyle, ["--cp-glow" as string]: t.glow ?? "rgba(0,0,0,.25)", ["--cp-ink" as string]: t.ink ?? "#14120F" }}
    >
      <style>{CP_CSS}</style>
      <BackgroundLayer ctx={ctx} />
      {hasNav && nav.position === "top" && <NavBar ctx={ctx} rootRef={rootRef} />}
      <div className="relative">
        <Layout ctx={ctx} slug={slug} />
        <ForegroundLayer ctx={ctx} />
      </div>
      {hasNav && nav.position === "bottom" && <NavBar ctx={ctx} rootRef={rootRef} />}
      {resolveShare(config).enabled && <ShareButton ctx={ctx} slug={slug} />}
    </div>
  );
}
