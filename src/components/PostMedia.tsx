// src/components/PostMedia.tsx
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isVideoUrl } from "../hooks/useUploadPostMedia";
import { MediaViewer } from "./MediaViewer";

// Same drag-follows-your-finger physics/easing as SwipeableTabs.tsx —
// see that file's comment for the full reasoning. A slide swipe is a
// lighter, quicker gesture than a full tab change, so it commits a
// bit sooner (lower ratio) — otherwise identical feel, so the app's
// two swipeable surfaces don't feel like they belong to different apps.
const COMMIT_RATIO = 0.2;
const COMMIT_VELOCITY = 0.5; // px/ms — a fast flick commits even short of the ratio
const EDGE_RESISTANCE = 2.5;
const AXIS_LOCK_PX = 6;
// Below this much finger movement, a completed touch is treated as a
// tap (open the fullscreen viewer) rather than a swipe.
const TAP_MOVE_THRESHOLD = 8;

/**
 * Inline swipeable "slides" carousel — the feed-card equivalent of
 * MediaViewer's fullscreen swipe, so a multi-image post can be
 * flicked through without leaving the feed, the way Instagram/
 * Threads carousels work. A tap that isn't a real drag still opens
 * the fullscreen MediaViewer (for zoom), starting on whatever slide
 * is currently showing.
 *
 * A smaller, single-purpose copy of SwipeableTabs' gesture logic
 * rather than a shared abstraction — a carousel of images doesn't
 * need SwipeableTabs' per-pane height tracking or lazy mounting (an
 * <img> is cheap; a whole PostCard/ProjectCard tab isn't).
 */
function SlideCarousel({
  mediaUrls,
  onOpenViewer,
}: {
  mediaUrls: string[];
  onOpenViewer: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [dragPx, setDragPx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const count = mediaUrls.length;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const ro = new ResizeObserver((entries) => setContainerWidth(entries[0].contentRect.width));
    ro.observe(node);
    setContainerWidth(node.offsetWidth);
    return () => ro.disconnect();
  }, []);

  const touchState = useRef<{
    startX: number;
    startY: number;
    prevX: number;
    prevT: number;
    lastX: number;
    lastT: number;
    axis: "x" | "y" | null;
    maxMove: number;
  } | null>(null);
  // Set for the duration of a real swipe (axis resolved to "x") so the
  // synthetic "click" event browsers fire right after touchend can be
  // told apart from a genuine tap/mouse-click — without this, finishing
  // a swipe would also pop open the fullscreen viewer.
  const hadDragRef = useRef(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    function handleTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      const now = Date.now();
      hadDragRef.current = false;
      touchState.current = {
        startX: t.clientX,
        startY: t.clientY,
        prevX: t.clientX,
        prevT: now,
        lastX: t.clientX,
        lastT: now,
        axis: null,
        maxMove: 0,
      };
    }

    function handleTouchMove(e: TouchEvent) {
      const state = touchState.current;
      if (!state) return;
      const t = e.touches[0];
      const dx = t.clientX - state.startX;
      const dy = t.clientY - state.startY;
      state.maxMove = Math.max(state.maxMove, Math.abs(dx), Math.abs(dy));

      if (state.axis === null) {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
        state.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (state.axis === "y") {
          // A vertical scroll, not a slide swipe — let the page handle it.
          touchState.current = null;
          return;
        }
        setDragging(true);
        hadDragRef.current = true;
      }

      // Committed to a horizontal swipe — stop the page from also scrolling.
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
        // Never moved past the axis-lock threshold at all — a plain tap.
        if (state && state.maxMove < TAP_MOVE_THRESHOLD) onOpenViewer(index);
        setDragPx(0);
        return;
      }

      const width = containerRef.current?.offsetWidth || 1;
      const elapsedMs = Math.max(1, state.lastT - state.prevT);
      const velocity = (state.lastX - state.prevX) / elapsedMs; // px/ms, negative = leftward

      let target = index;
      if (dragPx <= -width * COMMIT_RATIO || velocity <= -COMMIT_VELOCITY) {
        target = Math.min(count - 1, index + 1);
      } else if (dragPx >= width * COMMIT_RATIO || velocity >= COMMIT_VELOCITY) {
        target = Math.max(0, index - 1);
      }

      const wasTap = state.maxMove < TAP_MOVE_THRESHOLD;
      setDragPx(0);
      if (target !== index) setIndex(target);
      else if (wasTap) onOpenViewer(index);
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
    // and commit-target math always sees the current slide, not a stale one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, count, dragPx, onOpenViewer]);

  const width = containerWidth || 1;

  function handleClick() {
    // Swallows the synthetic click that follows a real touch swipe —
    // see hadDragRef above. A genuine tap or mouse click falls through.
    if (hadDragRef.current) {
      hadDragRef.current = false;
      return;
    }
    onOpenViewer(index);
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onClick={handleClick}
        className="w-full h-[380px] bg-canvas rounded-xl overflow-hidden border border-border cursor-pointer"
      >
        <div
          className="flex h-full"
          style={{
            width: `${count * 100}%`,
            transform: `translateX(${-index * width + dragPx}px)`,
            transition: dragging ? "none" : "transform 300ms cubic-bezier(0.16, 1, 0.3, 1)",
            touchAction: "pan-y",
          }}
        >
          {mediaUrls.map((url, i) => (
            <div
              key={i}
              className="shrink-0 h-full flex items-center justify-center"
              style={{ width: `${100 / count}%` }}
            >
              {isVideoUrl(url) ? (
                <video src={url} muted className="max-w-full max-h-full object-contain" draggable={false} />
              ) : (
                <img src={url} alt="" className="max-w-full max-h-full object-contain" draggable={false} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Desktop/pointer fallback — the touch handlers above don't
          fire for a mouse click, so this is the only way a
          non-touch user can page through slides or open the viewer. */}
      {index > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIndex(index - 1);
          }}
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 bg-ink/40 hover:bg-ink/60 text-white rounded-full p-1.5 transition-colors"
          aria-label="Previous slide"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      {index < count - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIndex(index + 1);
          }}
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 bg-ink/40 hover:bg-ink/60 text-white rounded-full p-1.5 transition-colors"
          aria-label="Next slide"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Dot indicators — the active dot stretches into a short pill
          instead of just changing color (same idea as iOS's page
          control), which stays legible even past ~4-5 slides where
          a row of plain same-size dots starts to blur together. */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-ink/40 backdrop-blur-sm pointer-events-none">
        {mediaUrls.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
            }`}
          />
        ))}
      </div>

      {/* Slide counter — kept alongside the dots since a count like "12"
          isn't legible as dots alone, and the two together read the
          same way Instagram's carousel chrome does. */}
      <span className="absolute top-2 right-2 bg-ink/50 text-white text-xs font-medium px-2 py-0.5 rounded-full pointer-events-none">
        {index + 1}/{count}
      </span>
    </div>
  );
}

/**
 * A single post's attached media. One image renders as a simple
 * bounded box (tap opens the fullscreen viewer for zoom); more than
 * one renders as an inline "slides" carousel — see SlideCarousel
 * above. `isVideoUrl`/<video> handling is kept in both so posts
 * uploaded before videos were disallowed (item 4) keep rendering
 * correctly; new uploads can no longer produce a video URL here (see
 * useUploadPostMedia.ts).
 */
export function PostMedia({ mediaUrls }: { mediaUrls: string[] }) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (mediaUrls.length === 0) return null;

  return (
    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
      {mediaUrls.length === 1 ? (
        <div
          className="cursor-pointer w-full max-h-[480px] min-h-[180px] flex items-center justify-center bg-canvas rounded-xl overflow-hidden border border-border"
          onClick={() => setViewerIndex(0)}
        >
          {isVideoUrl(mediaUrls[0]) ? (
            <video src={mediaUrls[0]} muted className="max-w-full max-h-[480px] object-contain" />
          ) : (
            <img src={mediaUrls[0]} alt="" className="max-w-full max-h-[480px] object-contain" />
          )}
        </div>
      ) : (
        <SlideCarousel mediaUrls={mediaUrls} onOpenViewer={setViewerIndex} />
      )}

      {viewerIndex !== null && (
        <MediaViewer mediaUrls={mediaUrls} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </div>
  );
}
