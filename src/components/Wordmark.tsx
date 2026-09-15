interface WordmarkProps {
  // "sm" — compact header rows (TopHeader, Wallet's sticky bar).
  // "lg" — full-screen brand moments (auth, onboarding). Default.
  size?: "sm" | "lg";
}

/**
 * The Akọ brand mark. Icon only, everywhere — the mark itself already
 * reads as "Akọ" (see AkoMark.tsx), so a separate serif "Akọ" text
 * label, or a tagline baked into the image, was always redundant. This
 * used to also render a text/tagline variant; every caller has moved
 * to icon-only, so that path is gone rather than left dead.
 */
export function Wordmark({ size = "lg" }: WordmarkProps) {
  const heightClass = size === "lg" ? "h-24" : "h-9";
  return (
    <div className="text-center">
      <img
        src="/app_icon_light_without_tagline.png"
        alt="Akọ"
        className={`inline-block dark:hidden ${heightClass} w-auto`}
      />
      <img
        src="/app_icon_dark_without_tagline.png"
        alt="Akọ"
        className={`hidden dark:inline-block ${heightClass} w-auto`}
      />
    </div>
  );
}
