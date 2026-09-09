// src/components/LikeHeart.tsx
import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";

interface LikeHeartProps {
  active: boolean;
  size?: number;
  className?: string;
}

const SPARK_COUNT = 6;
const SPARK_RADIUS = 15;

/**
 * Drop-in replacement for a plain <Heart fill={...} /> like icon. Animates
 * only on the false→true transition (liking, not un-liking, and never on
 * initial mount) — a quick overshoot pop plus a small burst of sparks, so
 * liking something reads as a tiny rewarded moment instead of a color swap.
 *
 * Used by PostCard, ProjectCard, and CommentThread — all three previously
 * rendered the same bare <Heart> with the same fill logic.
 */
export function LikeHeart({ active, size = 24, className }: LikeHeartProps) {
  const wasActive = useRef(active);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (active && !wasActive.current) {
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 500);
      wasActive.current = active;
      return () => clearTimeout(timer);
    }
    wasActive.current = active;
  }, [active]);

  return (
    <span className="relative inline-flex">
      <Heart
        size={size}
        fill={active ? "currentColor" : "none"}
        className={`${className ?? ""} ${animating ? "ako-like-pop" : ""}`}
      />
      {animating &&
        Array.from({ length: SPARK_COUNT }).map((_, i) => {
          const angle = (360 / SPARK_COUNT) * i;
          const rad = (angle * Math.PI) / 180;
          const x = Math.cos(rad) * SPARK_RADIUS;
          const y = Math.sin(rad) * SPARK_RADIUS;
          return (
            <span
              key={i}
              className={`ako-like-spark ${className ?? ""}`}
              style={{ "--ako-spark-x": `${x}px`, "--ako-spark-y": `${y}px` } as React.CSSProperties}
            />
          );
        })}
    </span>
  );
}
