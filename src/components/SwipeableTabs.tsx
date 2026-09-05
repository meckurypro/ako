// src/components/SwipeableTabs.tsx
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Real drag-tracking tab carousel — the content follows your finger during
 * the swipe and only settles into the next/previous tab on release, the
 * same feel as WhatsApp's top tabs. This replaces the old approach of
 * deciding the tab on touchend and then playing a fixed enter animation
 * (the removed .animate-tab-spring in index.css): that couldn't track the
 * finger mid-gesture since it didn't know the destination until the
 * gesture was already over.
 *
 * All tabs are mounted at once, laid out side by side in a flex row N
 * times the container's width, and the whole row is translated by
 * -index panes plus the live drag offset in px. Below the commit
 * threshold (and not a fast enough flick) it snaps back to where it
 * started; past it, it snaps forward to the neighboring tab — both via
 * the same CSS transition, just animating toward a different resting
 * position.
 *
 * Shared by Feed (For You/Top Discussions/Following), ProfilePage
 * (Posts/Projects), LikedHub and SavedHub (Posts/Projects) — anywhere a
 * horizontal tab row swipes between a small fixed set of panes.
 */

const COMMIT_RATIO = 0.33; // drag past 1/3 of the pane width commits the swipe
const COMMIT_VELOCITY = 0.5; // px/ms — a fast-enough flick commits even short of the ratio
const EDGE_RESISTANCE = 2.5; // divides drag distance past the first/last pane
const AXIS_LOCK_PX = 6; // movement needed before we decide horizontal vs. vertical intent

interface SwipeableTabsProps {
  /** Index of the currently active tab (owned by the parent, e.g. via useTabState). */
  index: number;
  /** Called once a swipe settles on a new tab (or a tab button jumps to one). */
  onIndexChange: (index: number) => void;
  /**
   * Continuous position while dragging (e.g. 1.4 while dragging from tab 1
   * toward tab 2) plus whether a drag is in progress right now — lets the
   * parent drive its tab-indicator bar with the same live tracking instead
   * of it only jumping once the swipe commits.
   */
  onProgress?: (progress: number, dragging: boolean) => void;
  /** One pane per tab, in tab order. */
  children: ReactNode[];
  className?: string;
}

export function SwipeableTabs({ index, onIndexChange, onProgress, children, className }: SwipeableTabsProps) {
  const count = children.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const paneRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [containerWidth, setContainerWidth] = useState(0);
  const [heights, setHeights] = useState<number[]>(() => Array(count).fill(0));
  const [dragPx, setDragPx] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Container width, kept live across resize/rotation rather than read once,
  // since it's what turns "px dragged" into "how far across one pane".
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const ro = new ResizeObserver((entries) => setContainerWidth(entries[0].contentRect.width));
    ro.observe(node);
    setContainerWidth(node.offsetWidth);
    return () => ro.disconnect();
  }, []);

  // Each pane's own height, so the carousel can smoothly grow/shrink to
  // match whichever tab is (becoming) active instead of either clipping a
  // taller tab or leaving blank space under a shorter one.
  useEffect(() => {
    const observers = paneRefs.current.slice(0, count).map((node, i) => {
      if (!node) return null;
      const ro = new ResizeObserver((entries) => {
        const h = entries[0].contentRect.height;
        setHeights((prev) => {
          if (prev[i] === h) return prev;
          const next = prev.length === count ? [...prev] : Array(count).fill(0);
          next[i] = h;
          return next;
        });
      });
      ro.observe(node);
      return ro;
    });
    return () => observers.forEach((ro) => ro?.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  // Manual (non-passive) touchmove listener — React's JSX onTouchMove is
  // attached as a passive root listener, so calling preventDefault() there
  // silently fails to stop the page from also scrolling. Attaching by hand
  // lets us mark only touchmove as non-passive, which is what we actually
  // need to hold off vertical scroll/rubber-banding once a horizontal
  // swipe is under way.
  const touchState = useRef<{
    startX: number;
    startY: number;
    prevX: number;
    prevT: number;
    lastX: number;
    lastT: number;
    axis: "x" | "y" | null;
  } | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    function handleTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      const now = Date.now();
      touchState.current = {
        startX: t.clientX,
        startY: t.clientY,
        prevX: t.clientX,
        prevT: now,
        lastX: t.clientX,
        lastT: now,
        axis: null,
      };
      setDragging(true);
    }

    function handleTouchMove(e: TouchEvent) {
      const state = touchState.current;
      if (!state) return;
      const t = e.touches[0];
      const dx = t.clientX - state.startX;
      const dy = t.clientY - state.startY;

      if (state.axis === null) {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
        state.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (state.axis === "y") {
          // A vertical scroll, not a tab swipe — hand back to the page and
          // stop tracking this gesture entirely.
          touchState.current = null;
          setDragging(false);
          return;
        }
      }

      // Committed to a horizontal swipe: stop the page (or pull-to-refresh)
      // from also reacting to the same finger movement.
      e.preventDefault();

      let clamped = dx;
      if ((index === 0 && dx > 0) || (index === count - 1 && dx < 0)) {
        clamped = dx / EDGE_RESISTANCE;
      }

      state.prevX = state.lastX;
      state.prevT = state.lastT;
      state.lastX = t.clientX;
      state.lastT = Date.now();
      setDragPx(clamped);
    }

    function handleTouchEnd() {
      const state = touchState.current;
      touchState.current = null;
      setDragging(false);

      if (!state || state.axis !== "x") {
        setDragPx(0);
        return;
      }

      const width = containerRef.current?.offsetWidth || 1;
      // Velocity from just the last couple of samples (not the whole
      // gesture) so a fast flick near release commits the swipe even if
      // the total distance dragged fell short of the ratio threshold.
      const elapsedMs = Math.max(1, state.lastT - state.prevT);
      const velocity = (state.lastX - state.prevX) / elapsedMs; // px/ms, negative = leftward

      let target = index;
      if (dragPx <= -width * COMMIT_RATIO || velocity <= -COMMIT_VELOCITY) {
        target = Math.min(count - 1, index + 1);
      } else if (dragPx >= width * COMMIT_RATIO || velocity >= COMMIT_VELOCITY) {
        target = Math.max(0, index - 1);
      }

      setDragPx(0);
      if (target !== index) onIndexChange(target);
    }

    node.addEventListener("touchstart", handleTouchStart, { passive: true });
    node.addEventListener("touchmove", handleTouchMove, { passive: false });
    node.addEventListener("touchend", handleTouchEnd, { passive: true });
    node.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    return () => {
      node.removeEventListener("touchstart", handleTouchStart);
      node.removeEventListener("touchmove", handleTouchMove);
      node.removeEventListener("touchend", handleTouchEnd);
      node.removeEventListener("touchcancel", handleTouchEnd);
    };
    // Re-bound whenever index/count change so the closure's edge-resistance
    // and commit-target math always sees the current tab, not a stale one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, count, onIndexChange]);

  const paneWidth = containerWidth || 1;
  // Continuous position across the whole strip — e.g. 1.4 while 40% of the
  // way from tab 1 toward tab 2. Drives the indicator bar and the
  // height-interpolation below with the same live number the transform uses.
  const continuousIndex = index - dragPx / paneWidth;
  const lower = Math.max(0, Math.min(count - 1, Math.floor(continuousIndex)));
  const upper = Math.max(0, Math.min(count - 1, Math.ceil(continuousIndex)));
  const frac = continuousIndex - lower;
  const measuredHeight =
    heights[lower] && heights[upper]
      ? heights[lower] + (heights[upper] - heights[lower]) * frac
      : heights[index] || undefined;

  useEffect(() => {
    onProgress?.(continuousIndex, dragging);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuousIndex, dragging]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className ?? ""}`}
      style={{
        height: measuredHeight,
        transition: dragging ? "none" : "height 300ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        className="flex items-start"
        style={{
          width: `${count * 100}%`,
          transform: `translateX(${-index * paneWidth + dragPx}px)`,
          transition: dragging ? "none" : "transform 300ms cubic-bezier(0.16, 1, 0.3, 1)",
          touchAction: "pan-y",
        }}
      >
        {children.map((child, i) => (
          <div
            key={i}
            ref={(el) => {
              paneRefs.current[i] = el;
            }}
            // Explicit 1/N of the track's width (rather than relying on
            // flex-shrink math to squeeze a `width: 100%` pane down to the
            // right size) — one pane = exactly one container-width, however
            // many tabs there are.
            className="shrink-0"
            style={{ width: `${100 / count}%` }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
