// src/components/MediaViewer.tsx

import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { isVideoUrl } from "../hooks/useUploadPostMedia";

interface MediaViewerProps {
  mediaUrls: string[];
  startIndex: number;
  onClose: () => void;
}

const SWIPE_THRESHOLD = 50;

/**
 * Almost-full-screen media viewer — media only, no caption/author/
 * reactions, per the spec. Three ways to move between slides when
 * there's more than one item: swipe (touch), the arrow buttons
 * (pointer devices), or tapping the left/right thirds of the media
 * itself — tapping the middle third does nothing, so it doesn't
 * fight with swipe gestures. Close lives in a fixed bar at the
 * bottom center rather than a top-right corner, easier to reach
 * one-handed on a tall screen.
 */
export function MediaViewer({ mediaUrls, startIndex, onClose }: MediaViewerProps) {
  const [index, setIndex] = useState(startIndex);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const hasMultiple = mediaUrls.length > 1;

  function goTo(next: number) {
    setIndex(Math.max(0, Math.min(mediaUrls.length - 1, next)));
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      goTo(deltaX < 0 ? index + 1 : index - 1);
    }
    setTouchStartX(null);
  }

  function handleZoneTap(direction: "prev" | "next") {
    if (!hasMultiple) return;
    goTo(direction === "prev" ? index - 1 : index + 1);
  }

  const url = mediaUrls[index];

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {hasMultiple && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm z-10">
          {index + 1} / {mediaUrls.length}
        </div>
      )}

      {isVideoUrl(url) ? (
        <video src={url} controls autoPlay className="max-w-full max-h-full" />
      ) : (
        <img src={url} alt="" className="max-w-full max-h-full object-contain" />
      )}

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
  );
}
