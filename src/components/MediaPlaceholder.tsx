// src/components/MediaPlaceholder.tsx
// Visual stand-in for media that's missing or failed to load: deterministic gradient + kind icon.
import { useState, type CSSProperties } from "react";
import { Image as ImageIcon, Music, Video, User } from "lucide-react";
import { gradientFor, type MediaKind } from "../lib/mediaFallback";

const ICON = { image: ImageIcon, video: Video, audio: Music, avatar: User } as const;

export function MediaPlaceholder({
  kind = "image",
  seed = "",
  className = "",
  size = 24,
  label,
}: {
  kind?: MediaKind;
  seed?: string;
  className?: string;
  size?: number;
  label?: string;
}) {
  const [a, b] = gradientFor(seed);
  const Icon = ICON[kind];
  const style: CSSProperties = { background: `linear-gradient(135deg, ${a}, ${b})` };
  return (
    <div
      role="img"
      aria-label={label ?? `${kind} unavailable`}
      style={style}
      className={`flex items-center justify-center text-white/85 ${className}`}
    >
      <Icon size={size} strokeWidth={1.75} />
    </div>
  );
}

/** Cover art that never breaks: gradient + icon underneath, image on top only if it loads. */
export function SafeCover({
  src,
  kind = "audio",
  seed,
  className = "",
  iconSize = 16,
}: {
  src?: string | null;
  kind?: MediaKind;
  seed?: string;
  className?: string;
  iconSize?: number;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <MediaPlaceholder kind={kind} seed={seed ?? src ?? ""} size={iconSize} className="absolute inset-0" />
      {src && !failed && (
        <img
          src={src}
          alt=""
          data-no-fallback
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  );
}

/** <audio controls> that swaps to an "Audio unavailable" bar if the file is missing. */
export function SafeAudio({ src, className = "w-full h-9", autoPlay }: { src: string; className?: string; autoPlay?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <MediaPlaceholder
        kind="audio"
        seed={src}
        size={16}
        label="Audio unavailable"
        className={`${className} rounded-full gap-2 text-xs`}
      />
    );
  }
  return <audio src={src} controls autoPlay={autoPlay} data-no-fallback onError={() => setFailed(true)} className={className} />;
}
