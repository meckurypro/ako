// src/components/PageHero.tsx
// The hero slideshow at the top of a Page's landing view: one 16:9 frame of images,
// each with an optional title and caption. Visitors can swipe / drag / use the arrows
// or the segments; it also advances on its own, in the direction and at the pace the
// page's admin chose. It pauses whenever it shouldn't be moving — a finger or pointer
// on it, keyboard focus inside it, the tab hidden, it scrolled off-screen, "reduce
// motion" on, or the visitor pressing pause.
//
// It loops forever with no seam: the last slide glides into the first the same way any slide glides into the
// next (and the first back into the last when going backward). That is done with a cloned slide at each end —
// [last, 1, 2, …, N, first] — and, once a glide lands on a clone, a silent jump to the identical real slide.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { HeroDirection, PageHeroSlide } from "../types/database";

interface PageHeroProps {
  slides: PageHeroSlide[];
  autoplay: boolean;
  intervalSeconds: number;
  direction: HeroDirection;
  pageName: string;
}

const SETTLE_MS = 650; // how long a programmatic smooth scroll is allowed to run

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function PageHero({ slides, autoplay, intervalSeconds, direction, pageName }: PageHeroProps) {
  const count = slides.length;
  const loop = count > 1;
  // Extended strip: a clone of the last slide in front, a clone of the first slide behind.
  const strip = loop ? [slides[count - 1], ...slides, slides[0]] : slides;
  const realOf = useCallback((pos: number) => (loop ? (((pos - 1) % count) + count) % count : pos), [loop, count]);
  const posOf = useCallback((real: number) => (loop ? real + 1 : real), [loop]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0); // real slide, 0..count-1
  const posRef = useRef(0); // position in the extended strip
  const [userPaused, setUserPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  // While a programmatic scroll or a silent jump is happening we ignore the scroll listener, so the
  // slides it passes through don't flicker the segments or restart the timer.
  const lockRef = useRef(false);
  const lockTimer = useRef<number | undefined>(undefined);
  const settleTimer = useRef<number | undefined>(undefined);
  const touchResume = useRef<number | undefined>(undefined);

  const canAutoplay = autoplay && count > 1 && !reducedMotion;
  const running = canAutoplay && !userPaused && !interacting && !offscreen && !tabHidden;

  // Instantly put the scroller at an extended position (no animation, no listener noise).
  const place = useCallback((pos: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    lockRef.current = true;
    window.clearTimeout(lockTimer.current);
    posRef.current = pos;
    el.scrollTo({ left: pos * el.clientWidth, behavior: "auto" });
    lockTimer.current = window.setTimeout(() => (lockRef.current = false), 60);
  }, []);

  // Landed on a clone? Jump to the identical real slide — invisible, because they look the same.
  const normalize = useCallback(() => {
    if (!loop) return;
    if (posRef.current === 0) place(count);
    else if (posRef.current === count + 1) place(1);
  }, [loop, count, place]);

  // Initial placement, and whenever the number of slides changes (one added or removed).
  useLayoutEffect(() => {
    const real = Math.min(index, Math.max(count - 1, 0));
    if (real !== index) setIndex(real);
    place(posOf(real));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const moveTo = useCallback(
    (pos: number) => {
      const el = scrollerRef.current;
      if (!el || count === 0) return;
      lockRef.current = true;
      window.clearTimeout(lockTimer.current);
      window.clearTimeout(settleTimer.current);
      posRef.current = pos;
      setIndex(realOf(pos));
      el.scrollTo({ left: pos * el.clientWidth, behavior: reducedMotion ? "auto" : "smooth" });
      lockTimer.current = window.setTimeout(
        () => {
          lockRef.current = false;
          normalize();
        },
        reducedMotion ? 0 : SETTLE_MS
      );
    },
    [count, realOf, reducedMotion, normalize]
  );

  const goTo = useCallback((real: number) => moveTo(posOf(((real % count) + count) % count)), [count, moveTo, posOf]);
  const step = useCallback((delta: 1 | -1) => moveTo(posRef.current + delta), [moveTo]);

  // Autoplay: one timer per slide. Anything that changes `index` (including the
  // visitor swiping) restarts it, so a manual swipe always gets a full interval.
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => step(direction === "backward" ? -1 : 1), intervalSeconds * 1000);
    return () => window.clearTimeout(t);
  }, [running, index, direction, intervalSeconds, step]);

  // Follow the visitor's own swipes, and silently wrap when they swipe onto a clone.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    function onScroll() {
      if (lockRef.current) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const pos = Math.round(el!.scrollLeft / Math.max(el!.clientWidth, 1));
        posRef.current = pos;
        setIndex((prev) => {
          const real = realOf(pos);
          return prev === real ? prev : real;
        });
        window.clearTimeout(settleTimer.current);
        settleTimer.current = window.setTimeout(normalize, 140);
      });
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [realOf, normalize]);

  // Keep the frame aligned if the container is resized (rotation, desktop window).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (!lockRef.current) el.scrollTo({ left: posRef.current * el.clientWidth, behavior: "auto" });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Don't animate what nobody can see.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(lockTimer.current);
      window.clearTimeout(settleTimer.current);
      window.clearTimeout(touchResume.current);
    },
    []
  );

  if (count === 0) return null;

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label={`${pageName} highlights`}
      className="group relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && setInteracting(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setInteracting(false)}
      onTouchStart={() => {
        window.clearTimeout(touchResume.current);
        setInteracting(true);
      }}
      onTouchEnd={() => {
        window.clearTimeout(touchResume.current);
        touchResume.current = window.setTimeout(() => setInteracting(false), 1200);
      }}
      onFocus={() => setInteracting(true)}
      onBlur={() => setInteracting(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
      }}
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-surface shadow-[0_10px_40px_-18px_rgba(var(--shadow-ink-rgb),0.45)]">
        <div
          ref={scrollerRef}
          className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
          tabIndex={0}
        >
          {strip.map((slide, pos) => {
            const clone = loop && (pos === 0 || pos === count + 1);
            const i = realOf(pos);
            return (
            <figure
              key={clone ? `${slide.id}-${pos === 0 ? "pre" : "post"}` : slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={clone || undefined}
              className="relative m-0 h-full w-full shrink-0 snap-center"
            >
              <img
                src={slide.image_url}
                alt={clone ? "" : (slide.title ?? "")}
                draggable={false}
                loading={pos <= 1 || clone ? "eager" : "lazy"}
                decoding="async"
                className="h-full w-full select-none object-cover"
              />
              {(slide.title || slide.caption) && (
                <>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                  <figcaption className="absolute inset-x-0 bottom-0 px-5 pb-9 pt-10 sm:px-7 sm:pb-11">
                    {slide.title && (
                      <p className="font-display text-xl font-semibold leading-snug text-white drop-shadow sm:text-3xl">
                        {slide.title}
                      </p>
                    )}
                    {slide.caption && (
                      <p className="mt-1 line-clamp-2 text-sm leading-snug text-white/85 sm:text-base">{slide.caption}</p>
                    )}
                  </figcaption>
                </>
              )}
            </figure>
            );
          })}
        </div>

        {count > 1 && (
          <>
            {/* Arrows — pointer devices only; touch users just swipe. */}
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => step(-1)}
              className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/50 focus-visible:opacity-100 group-hover:opacity-100 md:flex"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => step(1)}
              className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/50 focus-visible:opacity-100 group-hover:opacity-100 md:flex"
            >
              <ChevronRight size={22} />
            </button>

            {/* Segments — also the progress of the current slide while autoplay runs. */}
            <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5 px-5">
              {slides.map((slide, i) => {
                const active = i === index;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={active}
                    onClick={() => goTo(i)}
                    className="flex h-5 items-center"
                  >
                    <span
                      className={`relative block h-1 overflow-hidden rounded-full bg-white/40 transition-[width] duration-300 ${
                        active ? "w-9" : "w-4"
                      }`}
                    >
                      {active && (
                        <span
                          key={`${index}-${running ? "run" : "stop"}`}
                          className={`absolute inset-0 block rounded-full bg-white ${
                            canAutoplay ? "ako-hero-progress" : ""
                          } ${canAutoplay && !running ? "ako-hero-progress--paused" : ""}`}
                          style={canAutoplay ? { animationDuration: `${intervalSeconds}s` } : undefined}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {canAutoplay && (
              <button
                type="button"
                aria-label={userPaused ? "Play slideshow" : "Pause slideshow"}
                onClick={() => setUserPaused((p) => !p)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/50"
              >
                {userPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
