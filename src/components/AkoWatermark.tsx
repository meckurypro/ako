// src/components/AkoWatermark.tsx

/**
 * Subtle branding mark in a post card's top-right corner — the point
 * of it is purely for screenshots: when someone shares a post outside
 * the app, this is the only thing that still says "Akọ" in the image.
 *
 * Uses the existing public/app_icon_*_without_tagline.png wordmarks
 * (already theme-paired: "dark" is tuned bright for a dark card
 * background, "light" tuned muted for a light one) rather than new
 * assets — swapped with the same dark: variant every other themed
 * pair in this app uses, so it tracks .dark on <html> automatically,
 * including in Page mode (dark.page-mode still carries .dark).
 *
 * Sized to sit roughly level with the Follow pill's own footprint
 * (text-[11px] px-2.5 py-1 ⇒ ~24px tall) rather than the full-size
 * app icon — small but not a tiny illegible smear in a screenshot.
 *
 * PostCard is responsible for when NOT to render this — skipped on
 * archived-frozen cards (Restore/Delete already own that corner) and
 * on a plain reshare (RepostBadge already owns it there); see the
 * call site's own comment for why.
 */
export function AkoWatermark() {
  return (
    <div className="pointer-events-none select-none" aria-hidden="true">
      <img
        src="/app_icon_light_without_tagline.png"
        alt=""
        draggable={false}
        className="h-5 w-auto dark:hidden opacity-90"
      />
      <img
        src="/app_icon_dark_without_tagline.png"
        alt=""
        draggable={false}
        className="hidden dark:block h-5 w-auto opacity-90"
      />
    </div>
  );
}
