// src/components/MediaPreviewPlayer.tsx
import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

const PREVIEW_SECONDS = 20;

interface MediaPreviewPlayerProps {
  kind: "audio" | "video";
  src: string;
}

// Plays an uploaded Media audio/video channel as a hard-capped ~20s
// preview. Deliberately does NOT use the native `controls` UI — a
// native scrub bar would let a visitor drag past the cap and see
// (or hear) exactly how long the real file is, which defeats the
// point of it being a preview rather than the full asset. This is a
// small custom player instead: one play/pause button and a progress
// bar that only ever fills up to the cap.
export function MediaPreviewPlayer({ kind, src }: MediaPreviewPlayerProps) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ended, setEnded] = useState(false);

  // A new src (switching which project's preview is loaded) should
  // always start playback state fresh.
  useEffect(() => {
    setIsPlaying(false);
    setElapsed(0);
    setEnded(false);
  }, [src]);

  function handleTimeUpdate() {
    const el = mediaRef.current;
    if (!el) return;
    if (el.currentTime >= PREVIEW_SECONDS) {
      el.pause();
      el.currentTime = PREVIEW_SECONDS;
      setElapsed(PREVIEW_SECONDS);
      setIsPlaying(false);
      setEnded(true);
      return;
    }
    setElapsed(el.currentTime);
  }

  function handleNativeEnded() {
    // The underlying file is shorter than the 20s cap — it finished
    // on its own before hitting the guard above.
    setIsPlaying(false);
    setEnded(true);
  }

  function togglePlay() {
    const el = mediaRef.current;
    if (!el) return;
    if (ended) {
      el.currentTime = 0;
      setElapsed(0);
      setEnded(false);
    }
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      void el.play();
      setIsPlaying(true);
    }
  }

  const progressPct = Math.min(100, (elapsed / PREVIEW_SECONDS) * 100);
  const elapsedSeconds = Math.min(PREVIEW_SECONDS, Math.floor(elapsed));

  return (
    <div className="w-full">
      {kind === "video" ? (
        <video
          ref={(el) => {
            mediaRef.current = el;
          }}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleNativeEnded}
          playsInline
          className="w-full rounded-lg max-h-72 bg-canvas mb-2"
        />
      ) : (
        <audio
          ref={(el) => {
            mediaRef.current = el;
          }}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleNativeEnded}
          className="hidden"
        />
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={ended ? "Replay preview" : isPlaying ? "Pause preview" : "Play preview"}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-canvas flex-shrink-0"
        >
          {ended ? (
            <RotateCcw size={14} />
          ) : isPlaying ? (
            <Pause size={14} fill="currentColor" />
          ) : (
            <Play size={14} fill="currentColor" className="ml-0.5" />
          )}
        </button>
        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
          <div className="h-full bg-accent transition-[width]" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="text-xs text-ink-muted tabular-nums flex-shrink-0">
          0:{String(elapsedSeconds).padStart(2, "0")} / 0:{PREVIEW_SECONDS}
        </span>
      </div>
      <p className="text-xs text-ink-muted mt-1">Preview — {PREVIEW_SECONDS}s</p>
    </div>
  );
}
