import { useEffect, useState } from "react";
import { gradientFor } from "../lib/mediaFallback";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "vn" | "lg" | "xl" | "2xl";
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  // Matches the Uche reference: avatar reads as a compact identity marker,
  // not a headline element — roughly in line with the name+role stack.
  md: "w-10 h-10 text-sm",
  vn: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
  lg: "w-20 h-20 text-2xl",
  "2xl": "w-28 h-28 text-4xl",
};

export function Avatar({ src, name, size = "md" }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        data-no-fallback
        onError={() => setFailed(true)}
        className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  // Missing/broken photo → initials on a gradient seeded by name (stable per person).
  const [a, b] = gradientFor(name);
  return (
    <div
      style={src ? { background: `linear-gradient(135deg, ${a}, ${b})` } : undefined}
      className={`${sizeClasses[size]} rounded-full font-medium flex items-center justify-center flex-shrink-0 ${
        src ? "text-white" : "bg-accent-soft text-accent"
      }`}
    >
      {initials}
    </div>
  );
}
