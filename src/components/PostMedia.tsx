// src/components/PostMedia.tsx
import { useEffect, useRef, useState, type SyntheticEvent } from "react";
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
 * Threads carousels work. A tap that isn't a real drag calls
 * `onTap` with the currently-showing slide — PostMedia below wires
 * this to opening the fullscreen MediaViewer; RepostEmbed (a quote/
 * reshare's embedded original) wires it to nothing extra, since the
 * whole embed is already a Link to the original post.
 *
 * A smaller, single-purpose copy of SwipeableTabs' gesture logic
 * rather than a shared abstraction — a carousel of images doesn't
 * need SwipeableTabs' per-pane height tracking or lazy mounting (an
 * <img> is cheap; a whole PostCard/ProjectCard tab isn't).
 *
 * Exported (not just used internally) so RepostEmbed can render a
 * real, swipeable carousel for a multi-image original instead of a
 * flat single-image thumbnail — see RepostEmbed.tsx for why that
 * used to break: a static <img> there had no
 * `data-swipeable-ignore`, so a swipe attempt on it fell through to
 * the surrounding Feed/Profile tab row's own touch handler and
 * dragged the whole page to a different tab instead of paging
 * images. Rendering through this component instead means the
 * embed's carousel owns its own horizontal drags, same as a native
 * post's.
 */
export function SlideCarousel({
  mediaUrls,
  onTap,
  frameClassName,
}: {
  mediaUrls: string[];
  onTap: (index: number) => void;
  // Overrides the default first-slide-aspect-ratio frame with a
  // fixed-size box (e.g. "h-32") — used by RepostEmbed, whose
  // compact embedded card has always shown a fixed-height thumbnail
  // rather than a full aspect-ratio card.
  frameClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [dragPx, setDragPx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const count = mediaUrls.length;

  // Carousel frame follows the FIRST slide's aspect ratio (same
  // convention Instagram/Threads carousels use — one shared frame,
  // not one height per slide) rather than a fixed height. Clamped to
  // a sane range so one unusually tall/wide first image can't force
  // every other slide into an awkward crop; a single posted image
  // (the common case) isn't clamped at all — see PostMedia below.
  // Skipped entirely when frameClassName is given (a fixed-size box
  // doesn't need this).
  const [frameAspect, setFrameAspect] = useState(1); // width / height, updated once the first slide's natural size is known
  function handleFirstImageLoad(e: SyntheticEvent<HTMLImageElement>) {
    if (frameClassName) return;
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const raw = img.naturalWidth / img.naturalHeight;
      setFrameAspect(Math.min(1.91, Math.max(0.5, raw)));
    }
  }

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
        if (state && state.maxMove < TAP_MOVE_THRESHOLD) onTap(index);
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
      else if (wasTap) onTap(index);
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
  }, [index, count, dragPx, onTap]);

  const width = containerWidth || 1;

  function handleClick(e: React.MouseEvent) {
    // Swallows the synthetic click that follows a real touch swipe —
    // see hadDragRef above — including stopping it from bubbling any
    // further. Without the stopPropagation, that trailing click would
    // still reach an ancestor Link (as in RepostEmbed, where this
    // carousel sits inside the embed's own Link to the original post)
    // and navigate away right as the user was mid-swipe through the
    // slides. A genuine tap or mouse click falls through untouched,
    // so normal navigation/viewer-opening behavior is unaffected.
    if (hadDragRef.current) {
      hadDragRef.current = false;
      e.stopPropagation();
      return;
    }
    onTap(index);
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onClick={handleClick}
        // Opts this gesture out of SwipeableTabs' capture (see
        // IGNORE_SELECTOR in SwipeableTabs.tsx) — without it, a swipe
        // started on a multi-image post bubbles up to the Feed tab
        // row's own native touch listener at the same time this
        // component's does, so both the slide *and* the tab track the
        // same finger and a horizontal drag on the carousel also
        // drags the page toward the next/previous tab. Marking the
        // carousel ignored gives it sole ownership of horizontal
        // drags that start here; tapping (as opposed to dragging)
        // still opens the fullscreen MediaViewer via handleClick
        // above, and that viewer is portaled to document.body (see
        // Portal.tsx) so its own swipe is isolated from the tab row
        // regardless.
        data-swipeable-ignore
        className={`w-full bg-canvas rounded-xl overflow-hidden border border-border cursor-pointer ${frameClassName ?? ""}`}
        style={frameClassName ? undefined : { aspectRatio: frameAspect }}
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
                <video src={url} muted className="w-full h-full object-cover" draggable={false} />
              ) : (
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                  onLoad={i === 0 ? handleFirstImageLoad : undefined}
                />
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
        // Card width is fixed (the column width); height follows the
        // image's own aspect ratio — no crop, no letterboxing, no
        // artificial cap. Portrait -> tall card. 1:1 -> square card.
        // Landscape (16:9, etc.) -> the image's long edge is forced to
        // the card's width, height follows proportionally. `h-auto`
        // is what does this: the browser derives height from the
        // image's intrinsic aspect once it's fetched, same as it
        // would for a plain <img> outside any card.
        <div
          className="cursor-pointer w-full bg-canvas rounded-xl overflow-hidden border border-border"
          onClick={() => setViewerIndex(0)}
        >
          {isVideoUrl(mediaUrls[0]) ? (
            <video src={mediaUrls[0]} muted className="block w-full h-auto" />
          ) : (
            <img src={mediaUrls[0]} alt="" className="block w-full h-auto" loading="lazy" />
          )}
        </div>
      ) : (
        <SlideCarousel mediaUrls={mediaUrls} onTap={setViewerIndex} />
      )}

      {viewerIndex !== null && (
        <MediaViewer mediaUrls={mediaUrls} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </div>
  );
}
