// src/components/ProjectImageCarousel.tsx
//
// The thumbnail of a project on its OWN page, swipeable to reveal the creator's
// supporting images (thumbnail first, max 5 slides). Used only by ProjectCard when
// `isDetailView` — lists and grids render the plain thumbnail.
//
// Native horizontal scroll-snap: the browser owns the gesture (momentum, rubber-band,
// vertical page scroll stays untouched), we only read the position for the dots.
// Mouse users get hover arrows; keyboard users get ←/→ on the focused carousel.
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ProjectImageCarousel({ images, alt = "" }: { images: string[]; alt?: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const [index, setIndex] = useState(0);
  const count = images.length;

  // A different set of images (e.g. after an edit) starts from the thumbnail again.
  const signature = images.join("|");
  useEffect(() => {
    setIndex(0);
    scrollerRef.current?.scrollTo({ left: 0 });
  }, [signature]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  function handleScroll() {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (!el || el.clientWidth === 0) return;
      const next = Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)));
      setIndex((prev) => (prev === next ? prev : next));
    });
  }

  function goTo(target: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.min(count - 1, Math.max(0, target));
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: clamped * el.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
    }
  }

  return (
    <div
      className="relative w-full h-full"
      role="group"
      aria-roledescription="carousel"
      aria-label="Project images"
    >
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className="flex w-full h-full overflow-x-auto snap-x snap-mandatory overscroll-x-contain no-scrollbar outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-inset"
      >
        {images.map((src, i) => (
          <div
            key={src + i}
            className="shrink-0 w-full h-full snap-center snap-always"
            role="group"
            aria-roledescription="slide"
            aria-label={`Image ${i + 1} of ${count}`}
          >
            <img
              src={src}
              alt={alt}
              draggable={false}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              className="w-full h-full object-cover select-none"
            />
          </div>
        ))}
      </div>

      {/* Mouse affordance — touch users just swipe. */}
      {index > 0 && (
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label="Previous image"
          className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full bg-ink/55 text-canvas backdrop-blur-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      {index < count - 1 && (
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label="Next image"
          className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full bg-ink/55 text-canvas backdrop-blur-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        >
          <ChevronRight size={18} />
        </button>
      )}

      <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-ink/45 backdrop-blur-md px-2.5 py-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === index ? "w-4 bg-canvas" : "w-1.5 bg-canvas/55"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
