// src/components/MediaViewer.tsx

import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { isVideoUrl } from "../hooks/useUploadPostMedia";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { Portal } from "./Portal";

interface MediaViewerProps {
  mediaUrls: string[];
  startIndex: number;
  onClose: () => void;
}

const SWIPE_THRESHOLD = 50;
const DISMISS_THRESHOLD = 120;
// Below this, a touch could still turn into either gesture — above it,
// whichever axis is ahead wins and the other is locked out for the
// rest of that touch, so a mostly-vertical drag can't also nudge the
// slide index, and vice versa.
const AXIS_LOCK_THRESHOLD = 12;

/**
 * Almost-full-screen media viewer — media only, no caption/author/
 * reactions, per the spec. Three ways to move between slides when
 * there's more than one item: swipe (touch), the arrow buttons
 * (pointer devices), or tapping the left/right thirds of the media
 * itself — tapping the middle third does nothing, so it doesn't
 * fight with swipe gestures. Close lives in a fixed bar at the
 * bottom center rather than a top-right corner, easier to reach
 * one-handed on a tall screen — and, per this update, dragging the
 * media itself downward closes the viewer too, matching the
 * WhatsApp/Instagram convention people already expect here.
 *
 * bg-black/text-white below are intentional, not a missed theme token
 * — same reasoning as ImageLightbox: photo/video-viewer chrome stays a
 * fixed black scrim regardless of the app's light/dark theme.
 */
export function MediaViewer({ mediaUrls, startIndex, onClose }: MediaViewerProps) {
  useBackDismiss(onClose);
  useScrollLock();
  const [index, setIndex] = useState(startIndex);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [axis, setAxis] = useState<"horizontal" | "vertical" | null>(null);
  const [dragY, setDragY] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);

  const hasMultiple = mediaUrls.length > 1;

  function goTo(next: number) {
    setIndex(Math.max(0, Math.min(mediaUrls.length - 1, next)));
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setAxis(null);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStart) return;
    const deltaX = e.touches[0].clientX - touchStart.x;
    const deltaY = e.touches[0].clientY - touchStart.y;

    // Decide (once) which gesture this touch is, the first time it
    // moves far enough to tell — then stick with that for the rest of
    // the gesture so it can't waver between dragging the slide down
    // and nudging it sideways.
    let currentAxis = axis;
    if (!currentAxis && (Math.abs(deltaX) > AXIS_LOCK_THRESHOLD || Math.abs(deltaY) > AXIS_LOCK_THRESHOLD)) {
      currentAxis = Math.abs(deltaY) > Math.abs(deltaX) ? "vertical" : "horizontal";
      setAxis(currentAxis);
    }

    // Only a downward drag dismisses — dragging up doesn't do anything
    // (nothing above the media to reveal), so don't fight the user's
    // thumb with a bogus offset for that direction.
    if (currentAxis === "vertical" && deltaY > 0) {
      setDragY(deltaY);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStart) return;

    if (axis === "vertical") {
      if (dragY > DISMISS_THRESHOLD) {
        setIsDismissing(true);
        onClose();
      } else {
        setDragY(0); // snap back — transition handles the animation
      }
    } else {
      const deltaX = e.changedTouches[0].clientX - touchStart.x;
      if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
        goTo(deltaX < 0 ? index + 1 : index - 1);
      }
    }

    setTouchStart(null);
    setAxis(null);
  }

  function handleZoneTap(direction: "prev" | "next") {
    if (!hasMultiple) return;
    goTo(direction === "prev" ? index - 1 : index + 1);
  }

  const url = mediaUrls[index];
  // Progress toward dismissal, for fading the scrim as the media is
  // dragged down — fully transparent by the point release would close it,
  // so the fade finishes exactly as the gesture would otherwise commit.
  const dismissProgress = Math.min(1, dragY / DISMISS_THRESHOLD);

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black z-50 flex items-center justify-center"
        style={{
          backgroundColor: `rgba(0,0,0,${(1 - dismissProgress * 0.85).toFixed(2)})`,
          transition: dragY === 0 ? "background-color 200ms ease-out" : "none",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {hasMultiple && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm z-10">
            {index + 1} / {mediaUrls.length}
          </div>
        )}

        <div
          style={{
            transform: `translateY(${dragY}px) scale(${1 - dismissProgress * 0.1})`,
            transition: dragY === 0 && !isDismissing ? "transform 200ms ease-out" : "none",
            opacity: isDismissing ? 0 : 1,
            touchAction: "none",
          }}
        >
          {isVideoUrl(url) ? (
            <video src={url} controls autoPlay className="max-w-full max-h-full" />
          ) : (
            <img src={url} alt="" className="max-w-full max-h-full object-contain" draggable={false} />
          )}
        </div>

        {hasMultiple && (
          <>
            {/* Invisible left/right tap zones — the middle third is
                left untouched so it doesn't compete with swipe or
                accidentally close the viewer. */}
            <button
              onClick={() => handleZoneTap("prev")}
              disabled={index === 0}
              className="absolute left-0 top-0 bottom-20 w-1/3 disabled:pointer-events-none"
              aria-label="Previous media"
            />
            <button
              onClick={() => handleZoneTap("next")}
              disabled={index === mediaUrls.length - 1}
              className="absolute right-0 top-0 bottom-20 w-1/3 disabled:pointer-events-none"
              aria-label="Next media"
            />

            {index > 0 && (
              <button
                onClick={() => goTo(index - 1)}
                className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 text-white/90 p-2 z-10"
                aria-label="Previous"
              >
                <ChevronLeft size={32} />
              </button>
            )}
            {index < mediaUrls.length - 1 && (
              <button
                onClick={() => goTo(index + 1)}
                className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 text-white/90 p-2 z-10"
                aria-label="Next"
              >
                <ChevronRight size={32} />
              </button>
            )}
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-6 pt-10 bg-gradient-to-t from-black/70 to-transparent">
          <button
            onClick={onClose}
            className="bg-white/15 text-white rounded-full p-3"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>
      </div>
    </Portal>
  );
}
