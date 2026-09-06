interface WordmarkProps {
  size?: "sm" | "lg";
  showTagline?: boolean;
  // Feed's TopHeader is the only caller that sets this. It swaps the
  // "Akọ" text + "A Reason to Reason" tagline for the pre-rendered
  // app_icon_dark/light.png in that exact slot, picking the right
  // one via the .dark class useTheme.tsx puts on <html> (same
  // pattern as the dark: overrides in PostCard/ReactionTray). Kept
  // separate from showTagline so Login/SignUp's bare <Wordmark />
  // (which relies on showTagline defaulting to true) keeps its
  // original text + tagline, unaffected by this.
  asIcon?: boolean;
  // Feed passes false: its header uses the app_icon_*_without_tagline
  // assets (mark only, no baked-in tagline) since the header slot is
  // too tight for the tagline to read well. Login/SignUp keep the
  // default (true) and get the tagline-included assets. Only read
  // when asIcon is true.
  iconTagline?: boolean;
}

/**
 * The Akọ wordmark + tagline, matching the brand mockup:
 * serif display face, sage-green tagline beneath.
 */
export function Wordmark({ size = "lg", showTagline = true, asIcon = false, iconTagline = true }: WordmarkProps) {
  if (asIcon) {
    const lightSrc = iconTagline ? "/app_icon_light.png" : "/app_icon_light_without_tagline.png";
    const darkSrc = iconTagline ? "/app_icon_dark.png" : "/app_icon_dark_without_tagline.png";
    const alt = iconTagline ? "Akọ — A Reason to Reason" : "Akọ";
    return (
      <div className="text-center">
        <img
          src={lightSrc}
          alt={alt}
          className={`inline-block dark:hidden ${size === "lg" ? "h-28" : "h-20"} w-auto`}
        />
        <img
          src={darkSrc}
          alt={alt}
          className={`hidden dark:inline-block ${size === "lg" ? "h-28" : "h-20"} w-auto`}
        />
      </div>
    );
  }

  return (
    <div className="text-center">
      <h1
        className={`font-display font-medium text-ink ${
          size === "lg" ? "text-6xl" : "text-3xl"
        }`}
      >
        Akọ
      </h1>
      {showTagline && (
        <p className="font-body text-accent text-sm mt-1 tracking-wide">
          A Reason to Reason
        </p>
      )}
    </div>
  );
}
