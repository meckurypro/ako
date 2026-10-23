// src/components/AkoMark.tsx
import { useTheme } from "../hooks/useTheme";

/**
 * Small theme-aware Akọ app icon — for compact inline spots (like the
 * notification row's "sent by Akọ" mark) that previously showed plain
 * text only. Uses the tagline-free icon variants since this always
 * renders at a small size next to other text, not as a standalone logo.
 */
export function AkoMark({
  size = 16,
  className = "",
  shadow = false,
}: {
  size?: number;
  className?: string;
  /**
   * Cast a soft shadow from the artwork's own shape (the letters), not from the image box. A box-shadow
   * outlines the whole rectangle and reads as a white card on light surfaces; drop-shadow follows the
   * transparent PNG's alpha, so only the "akọ" lettering casts onto the background.
   * Dark theme only: on light surfaces the (green) shadow read as a smudge, so light renders the plain icon.
   */
  shadow?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  // Theme-paired artwork, same as Wordmark and AkoWatermark: the "dark" file is the
  // brighter green tuned for dark surfaces, the "light" file the deeper green for light ones.
  const src =
    resolvedTheme === "dark" ? "/app_icon_dark_without_tagline.png" : "/app_icon_light_without_tagline.png";

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`inline-block rounded-[4px] align-text-bottom flex-shrink-0 ${className}`}
      style={
        shadow && resolvedTheme === "dark"
          ? { filter: "drop-shadow(0 6px 10px rgba(0, 0, 0, 0.55))" }
          : undefined
      }
    />
  );
}
