// src/components/ImageViewer.tsx
// Full-screen photo viewer: ←/→ (or swipe) between the photos of an album, click/double-click
// to zoom, Esc to close, download from the top bar. Opens on the clicked photo.
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, ImageOff } from "lucide-react";
import type { MediaItem } from "../lib/chatMedia";
import { openChatFile } from "../lib/downloadChatFile";
import { useMediaUrl } from "../hooks/useMediaUrl";

interface ImageViewerProps {
  items: MediaItem[];
  initialIndex: number;
  /** Who sent it and when — shown in the top bar, like WhatsApp. */
  title: string;
  subtitle: string;
  caption?: string;
  onClose: () => void;
}

export function ImageViewer({ items, initialIndex, title, subtitle, caption, onClose }: ImageViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const touchStart = useRef<number | null>(null);
  const { url, failed } = useMediaUrl(items[index]);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(items.length - 1, Math.max(0, i + delta)));
      setZoomed(false);
    },
    [items.length]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  async function download() {
    try {
      await openChatFile(items[index]);
    } catch {
      setError("Couldn't download that photo.");
      setTimeout(() => setError(null), 2500);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-black select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onTouchStart={(e) => {
        touchStart.current = zoomed ? null : e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStart.current == null) return;
        const dx = e.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden" onClick={() => setChrome((c) => !c)}>
        {failed ? (
          <div className="flex flex-col items-center gap-2 text-white/60">
            <ImageOff size={32} />
            <span className="text-sm">Photo unavailable</span>
          </div>
        ) : url ? (
          <img
            src={url}
            alt={items[index].name}
            draggable={false}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setZoomed((z) => !z);
            }}
            className={`max-w-full max-h-full object-contain transition-transform duration-200 ${zoomed ? "scale-[2.5] cursor-zoom-out" : "cursor-zoom-in"}`}
          />
        ) : (
          <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        )}
      </div>

      {chrome && (
        <>
          <div className="absolute top-0 inset-x-0 flex items-center gap-1 px-1 pb-2 pt-[max(env(safe-area-inset-top),4px)] bg-black/55">
            <button type="button" onClick={onClose} className="p-3 text-white" aria-label="Close">
              <ArrowLeft size={22} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{title}</p>
              <p className="text-white/70 text-xs truncate">{items.length > 1 ? `${index + 1} of ${items.length} · ${subtitle}` : subtitle}</p>
            </div>
            <button type="button" onClick={() => void download()} className="p-3 text-white" aria-label="Download photo">
              <Download size={21} />
            </button>
          </div>
          {items.length > 1 && index > 0 && (
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 text-white items-center justify-center">
              <ChevronLeft size={24} />
            </button>
          )}
          {items.length > 1 && index < items.length - 1 && (
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 text-white items-center justify-center">
              <ChevronRight size={24} />
            </button>
          )}
          {caption && (
            <div className="absolute bottom-0 inset-x-0 bg-black/55 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
              <p className="text-white text-sm whitespace-pre-wrap">{caption}</p>
            </div>
          )}
        </>
      )}
      {error && <div className="absolute bottom-20 inset-x-0 flex justify-center"><span className="bg-black/80 text-white text-sm rounded-full px-4 py-2">{error}</span></div>}
    </div>
  );
}
