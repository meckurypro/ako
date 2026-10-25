// src/lib/customPageScroll.ts
//
// Animated scroll-to-section for Custom Pages. A page is not always scrolled by the window: the public route is a
// fixed full-screen layer and the editor preview is a phone frame, so we find whichever ancestor really scrolls.
// Easing runs in requestAnimationFrame, which lets us offer curves CSS `scroll-behavior` can't (spring, bounce).
// Respects the system reduce-motion setting by jumping instead.
import { SCROLL_ANIMATIONS, type ScrollAnimationId } from "./customPage";

type Ease = (t: number) => number;

const easeInOutCubic: Ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutQuart: Ease = (t) => 1 - Math.pow(1 - t, 4);
const easeInOutSine: Ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeOutExpo: Ease = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeOutBack: Ease = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOutBounce: Ease = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

const EASES: Record<Exclude<ScrollAnimationId, "instant">, Ease> = {
  smooth: easeInOutCubic,
  "ease-out": easeOutQuart,
  spring: easeOutBack,
  bounce: easeOutBounce,
  slow: easeInOutSine,
  snap: easeOutExpo,
};

function reducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** The closest ancestor that scrolls vertically, or null when the window does. */
export function findScroller(from: HTMLElement | null): HTMLElement | null {
  let el = from?.parentElement ?? null;
  while (el && el !== document.body && el !== document.documentElement) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) return el;
    el = el.parentElement;
  }
  return null;
}

const running = new WeakMap<object, number>();

/**
 * Scrolls `scroller` (or the window) so that `target` sits `offset` pixels below the top edge.
 * A new call cancels one still in flight, and the visitor grabbing the page (wheel or touch) cancels it too.
 */
export function scrollToElement(target: HTMLElement, opts: { animation: ScrollAnimationId; offset?: number; scroller?: HTMLElement | null }): void {
  const scroller = opts.scroller === undefined ? findScroller(target) : opts.scroller;
  const holder: object = scroller ?? window;
  const prev = running.get(holder);
  if (prev) cancelAnimationFrame(prev);

  const offset = opts.offset ?? 0;
  const targetRect = target.getBoundingClientRect();
  const viewTop = scroller ? scroller.getBoundingClientRect().top : 0;
  const start = scroller ? scroller.scrollTop : window.scrollY;
  const max = scroller ? scroller.scrollHeight - scroller.clientHeight : document.documentElement.scrollHeight - window.innerHeight;
  const dest = Math.max(0, Math.min(max, start + (targetRect.top - viewTop) - offset));
  const apply = (y: number) => (scroller ? (scroller.scrollTop = y) : window.scrollTo(0, y));

  const def = SCROLL_ANIMATIONS.find((a) => a.id === opts.animation);
  const distance = Math.abs(dest - start);
  if (opts.animation === "instant" || !def || def.ms === 0 || reducedMotion() || distance < 2) {
    apply(dest);
    return;
  }

  const ease = EASES[opts.animation];
  // Long trips take a little longer, short hops a little less, so a nearby section doesn't feel sluggish.
  const duration = Math.round(def.ms * Math.min(1.35, Math.max(0.6, distance / 900 + 0.35)));
  const t0 = performance.now();

  const stop = () => {
    const id = running.get(holder);
    if (id) cancelAnimationFrame(id);
    running.delete(holder);
    cleanup();
  };
  const listenOn: EventTarget = scroller ?? window;
  const cleanup = () => {
    listenOn.removeEventListener("wheel", stop);
    listenOn.removeEventListener("touchstart", stop);
    listenOn.removeEventListener("keydown", stop);
  };
  listenOn.addEventListener("wheel", stop, { passive: true });
  listenOn.addEventListener("touchstart", stop, { passive: true });
  listenOn.addEventListener("keydown", stop);

  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / duration);
    // Overshoot curves can leave [0,1]; the scroller clamps the position itself.
    apply(start + (dest - start) * ease(t));
    if (t < 1) {
      running.set(holder, requestAnimationFrame(step));
    } else {
      apply(dest);
      running.delete(holder);
      cleanup();
    }
  };
  running.set(holder, requestAnimationFrame(step));
}
