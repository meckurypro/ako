// src/components/customPage/Reveal.tsx
// Scroll-reveal for Custom Page sections. Respects prefers-reduced-motion (content simply appears), and only ever
// animates opacity/transform so it stays cheap on low-end phones.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { AnimationId } from "../../lib/customPage";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

const HIDDEN: Record<Exclude<AnimationId, "none" | "stagger">, CSSProperties> = {
  fade: { opacity: 0 },
  "slide-up": { opacity: 0, transform: "translateY(28px)" },
  zoom: { opacity: 0, transform: "scale(0.95)" },
  blur: { opacity: 0, filter: "blur(14px)", transform: "translateY(10px)" },
  pop: { opacity: 0, transform: "scale(0.86) translateY(14px)" },
  "slide-left": { opacity: 0, transform: "translateX(-36px)" },
  tilt: { opacity: 0, transform: "perspective(900px) rotateX(10deg) translateY(26px)" },
  bounce: { opacity: 0, transform: "translateY(-36px) scale(0.96)" },
};

const EASE: Partial<Record<AnimationId, string>> = {
  pop: "cubic-bezier(.34,1.56,.64,1)",
  tilt: "cubic-bezier(.2,.8,.2,1)",
  bounce: "cubic-bezier(.34,1.8,.64,1)",
};

export function Reveal({
  animation,
  index = 0,
  className,
  children,
}: {
  animation: AnimationId;
  /** Position among siblings — only the "stagger" preset uses it, as a delay. */
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const skip = animation === "none" || prefersReducedMotion();
  const [shown, setShown] = useState(skip);

  useEffect(() => {
    if (skip || shown) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [skip, shown]);

  if (skip) return <div className={className}>{children}</div>;

  const hidden = animation === "stagger" ? HIDDEN["slide-up"] : HIDDEN[animation];
  const style: CSSProperties = shown
    ? {
        opacity: 1,
        transform: "none",
        filter: "none",
        transition: `opacity 700ms ease ${animation === "stagger" ? index * 90 : 0}ms, transform ${animation === "pop" ? 650 : animation === "bounce" ? 800 : 750}ms ${EASE[animation] ?? "cubic-bezier(.2,.7,.2,1)"} ${animation === "stagger" ? index * 90 : 0}ms, filter 800ms ease`,
      }
    : hidden;

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
