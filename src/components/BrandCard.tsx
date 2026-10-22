// src/components/BrandCard.tsx
//
// The one bold, filled surface on money pages (Wallet balance, Affiliate earnings).
//
// Colour rule it exists to enforce: a filled brand surface uses --color-cta (the deep green made to carry
// WHITE text — same token as the Profile's primary buttons), never --color-accent with canvas-coloured
// text. In dark mode --color-accent is a bright mid-green, and near-black text on it reads as a mistake.
// Everything on this card is therefore white at a stated opacity: 100% for figures, 90% for small labels on the lower, darker half; the top caption is full white.
// The gradient starts at the exact CTA green (white on it is 4.8:1 in dark, 7.6:1 in light) and only darkens
// from there, so no label ever sits on a lighter patch than the token it was contrast-checked against.
//
// Depth comes from restraint, like the Profile: a soft top-light, a hairline inner ring, two faint
// concentric arcs in the corner, and one tinted glow shadow — no icons watermarked at random.
import type { ReactNode } from "react";

export function BrandCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] text-white ${className}`}
      style={{
        background: [
          "radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 55%)",
          "linear-gradient(150deg, var(--color-cta) 0%, var(--color-cta) 45%, color-mix(in srgb, var(--color-cta) 62%, black) 100%)",
        ].join(", "),
        boxShadow: [
          "inset 0 0 0 1px rgba(255,255,255,0.10)",
          "inset 0 1px 0 rgba(255,255,255,0.18)",
          "0 24px 44px -22px rgba(var(--accent-rgb), 0.65)",
          "0 10px 24px -14px rgba(var(--shadow-ink-rgb), 0.5)",
        ].join(", "),
      }}
    >
      {/* Concentric arcs — purely decorative, clipped by the card. */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rounded-full border border-white/10" />
      <div className="relative">{children}</div>
    </div>
  );
}
