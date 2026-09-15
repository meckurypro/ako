// src/components/AkoMark.tsx
import { useTheme } from "../hooks/useTheme";

/**
 * Small theme-aware Akọ app icon — for compact inline spots (like the
 * notification row's "sent by Akọ" mark) that previously showed plain
 * text only. Uses the tagline-free icon variants since this always
 * renders at a small size next to other text, not as a standalone logo.
 */
export function AkoMark({ size = 16, className = "" }: { size?: number; className?: string }) {
  const { resolvedTheme } = useTheme();
  // Icon should contrast with the surrounding UI, not match it — a dark
  // icon reads on light chrome, a light icon reads on dark chrome.
  const src =
    resolvedTheme === "dark" ? "/app_icon_light_without_tagline.png" : "/app_icon_dark_without_tagline.png";

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`inline-block rounded-[4px] align-text-bottom flex-shrink-0 ${className}`}
    />
  );
}
