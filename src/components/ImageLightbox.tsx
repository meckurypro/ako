// src/components/ImageLightbox.tsx
import { useEffect } from "react";
import { X } from "lucide-react";
import { useBackDismiss } from "../hooks/useBackDismiss";

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

// Near-fullscreen image viewer — used for profile photos so a visitor can
// tap the avatar to see it large instead of squinting at a small circle.
// bg-black/text-white below are intentional, not a missed theme token —
// photo-viewer chrome (same as Instagram/Twitter/Apple Photos) stays a
// fixed black scrim in both light and dark app themes, since a themed
// canvas color behind photos would wash out contrast either way.
export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  useBackDismiss(onClose);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    // Lock background scroll while the viewer is open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center px-4 py-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10"
      >
        <X size={22} />
      </button>

      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg"
      />
    </div>
  );
}
