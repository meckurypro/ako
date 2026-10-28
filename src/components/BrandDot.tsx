// src/components/BrandDot.tsx
// The brand-orange touch: one small dot after a page title. Orange is the Akọ logo colour, but it is loud, so the
// app spends it sparingly — green stays the working colour (buttons, selection, links) and orange only signs the
// page. Keep it this small; don't use it on buttons, fills or large areas.
export function BrandDot({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand-orange align-middle ${className}`} />;
}
