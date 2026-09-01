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
 * reactions, per the spec. Swipe left/right (touch) or the arrow
 * buttons (pointer devices) move between slides when there's more
 * than one item.
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

  const url = mediaUrls[index];

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/90 p-2 z-10"
        aria-label="Close"
      >
        <X size={26} />
      </button>

      {hasMultiple && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm z-10">
          {index + 1} / {mediaUrls.length}
        </div>
      )}

      {hasMultiple && index > 0 && (
        <button
          onClick={() => goTo(index - 1)}
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 text-white/90 p-2 z-10"
          aria-label="Previous"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {isVideoUrl(url) ? (
        <video
          src={url}
          controls
          autoPlay
          className="max-w-full max-h-full"
        />
      ) : (
        <img src={url} alt="" className="max-w-full max-h-full object-contain" />
      )}

      {hasMultiple && index < mediaUrls.length - 1 && (
        <button
          onClick={() => goTo(index + 1)}
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 text-white/90 p-2 z-10"
          aria-label="Next"
        >
          <ChevronRight size={32} />
        </button>
      )}
    </div>
  );
}
