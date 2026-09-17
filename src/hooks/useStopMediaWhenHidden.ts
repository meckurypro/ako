// src/hooks/useStopMediaWhenHidden.ts
import { useEffect, type RefObject } from "react";

/**
 * "If you leave the preview, the media must stop playing" — for any
 * player whose container can end up off-screen or unmounted without
 * the person explicitly pressing pause: scrolled out of the list
 * (Archive/LikedHub/SavedHub/ProfilePage grids), swiped to the other
 * SwipeableTabs pane (which keeps every pane mounted side-by-side —
 * see SwipeableTabs.tsx's own comment — so an inactive pane's player
 * would otherwise keep playing invisibly), or the sheet/page it's on
 * closing outright.
 *
 * Deliberately one-directional — this only ever stops, never resumes
 * or autoplays on (re)entering view. That's MusicAttribution.tsx's
 * own feed-autoplay behavior, a different feature with its own
 * IntersectionObserver; this hook is just the universal "leaving =
 * stop" half, reused by every tap-to-preview player.
 *
 * `containerRef` should point at a normally-sized, visible element
 * (the player's own wrapper/button), never the <audio>/<video> node
 * itself — a hidden/zero-size media element reports a permanent zero
 * intersection ratio, which would fire `stop` immediately on mount.
 *
 * `deps` re-runs the observer setup when the container itself only
 * exists conditionally (e.g. gated behind an async fetch that resolves
 * after first mount, so `containerRef.current` is still null the one
 * time this would otherwise run). Every current caller renders its
 * wrapper unconditionally from mount, so the default `[]` (run once)
 * is enough for them.
 */
export function useStopMediaWhenHidden(
  containerRef: RefObject<HTMLElement | null>,
  stop: () => void,
  deps: unknown[] = [],
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) stop();
      },
      { threshold: 0 },
    );
    observer.observe(el);
    // Unmount (sheet closed, route navigated away, etc.) is the other
    // half of "leaving" — belt-and-suspenders alongside whatever
    // already happens to the underlying element when React removes it.
    return () => {
      observer.disconnect();
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
