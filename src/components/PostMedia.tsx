// src/components/PostMedia.tsx
import { useState } from "react";
import { isVideoUrl } from "../hooks/useUploadPostMedia";
import { MediaViewer } from "./MediaViewer";

/**
 * Shows only the first media item in-feed. A bounded box with
 * object-contain (rather than a fixed aspect-ratio crop) means 9:16,
 * 16:9, and 1:1 media all fit without cropping or letterboxing
 * weirdness — the box just sizes to whichever dimension is
 * constraining. When there's more than one item, two offset
 * duplicate "sheets" sit behind the first to read as a stack, and a
 * count badge confirms how many. Tapping opens the fullscreen
 * viewer (media only, no caption) to swipe through the rest.
 */
export function PostMedia({ mediaUrls }: { mediaUrls: string[] }) {
  const [viewerOpen, setViewerOpen] = useState(false);

  if (mediaUrls.length === 0) return null;

  const first = mediaUrls[0];
  const hasMore = mediaUrls.length > 1;

  return (
    <>
      <div
        className="relative mt-3 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setViewerOpen(true);
        }}
      >
        {hasMore && (
          <>
            <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-xl bg-ink/10 -z-10" />
            <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-xl bg-ink/5 -z-20" />
          </>
        )}

        <div className="w-full max-h-[480px] min-h-[180px] flex items-center justify-center bg-canvas rounded-xl overflow-hidden border border-border">
          {isVideoUrl(first) ? (
            <video src={first} muted className="max-w-full max-h-[480px] object-contain" />
          ) : (
            <img src={first} alt="" className="max-w-full max-h-[480px] object-contain" />
          )}
        </div>

        {hasMore && (
          <span className="absolute bottom-2 right-2 bg-ink/60 text-canvas text-xs font-medium px-2 py-0.5 rounded-full">
            1/{mediaUrls.length}
          </span>
        )}
      </div>

      {viewerOpen && (
        <MediaViewer
          mediaUrls={mediaUrls}
          startIndex={0}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}
