// src/components/customPage/HeroSlides.tsx
// Crossfading hero slideshow. One image = no timer. Reduced-motion users get a still first image with dots to step through.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { publicFileUrl, type CustomPageImage } from "../../lib/customPage";

export function HeroSlides({
  images,
  className = "",
  overlay,
  intervalMs = 5500,
  index: indexProp,
  onIndexChange,
  dots = true,
}: {
  images: CustomPageImage[];
  className?: string;
  /** Content laid over the slides (the Showcase template puts the title here). */
  overlay?: ReactNode;
  intervalMs?: number;
  /** Controlled mode: the parent owns which slide shows (templates with Previous / Next controls). */
  index?: number;
  onIndexChange?: (index: number) => void;
  /** Show the dot row. Templates that draw their own controls turn it off. */
  dots?: boolean;
}) {
  const [inner, setInner] = useState(0);
  const index = indexProp ?? inner;
  const count = images.length;
  const latest = useRef({ index, onIndexChange });
  latest.current = { index, onIndexChange };
  const setIndex = (n: number) => {
    setInner(n);
    latest.current.onIndexChange?.(n);
  };

  useEffect(() => {
    if (count < 2 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setIndex((latest.current.index + 1) % count), intervalMs);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, intervalMs]);

  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, index]);

  if (count === 0) return null;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {images.map((img, i) => (
        <img
          key={img.path}
          src={publicFileUrl(img.path) ?? ""}
          alt={img.caption ?? ""}
          loading={i === 0 ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: i === index ? 1 : 0, transition: "opacity 900ms ease" }}
        />
      ))}
      {overlay}
      {count > 1 && dots && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
          {images.map((img, i) => (
            <button
              key={img.path}
              type="button"
              aria-label={`Show image ${i + 1}`}
              onClick={() => setIndex(i)}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === index ? 22 : 8, background: i === index ? "#fff" : "rgba(255,255,255,.55)" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
