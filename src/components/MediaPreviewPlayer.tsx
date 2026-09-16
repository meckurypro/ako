// src/components/MediaPreviewPlayer.tsx
import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

// Bumped from 20s to 30s (matches the Music Catalogue's own clip cap —
// see reduce_music_clip_max_to_30_seconds — so a published catalogue
// clip and an in-app Media preview never disagree on "how much do you
// get to hear/see for free").
export const PREVIEW_SECONDS = 30;

interface MediaPreviewPlayerProps {
  kind: "audio" | "video";
  src: string;
}

// Plays an uploaded Media audio/video channel as a hard-capped ~30s
// preview that loops forever rather than stopping dead — a visitor
// scrubbing past the cap or letting it finish just hears/sees it
// again from the top, the same "endless preview" feel as
// SongCoverPlayer's audio+cover loop below, now shared by every
// Media preview regardless of shape. Deliberately does NOT use the
// native `controls` UI — a native scrub bar would let a visitor drag
// past the cap and see (or hear) exactly how long the real file is,
// which defeats the point of it being a preview rather than the full
// asset. This is a small custom player instead: one play/pause
// button and a progress bar that only ever fills up to the cap.
export function MediaPreviewPlayer({ kind, src }: MediaPreviewPlayerProps) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // A new src (switching which project's preview is loaded) should
  // always start playback state fresh.
  useEffect(() => {
    setIsPlaying(false);
    setElapsed(0);
  }, [src]);

  // Loop within the preview cap: jump back to 0 and keep playing
  // instead of pausing at the cap.
  function handleTimeUpdate() {
    const el = mediaRef.current;
    if (!el) return;
    if (el.currentTime >= PREVIEW_SECONDS) {
      el.currentTime = 0;
      void el.play();
      setElapsed(0);
      return;
    }
    setElapsed(el.currentTime);
  }

  // A file shorter than the cap ends on its own — loop that too,
  // rather than leaving it stopped at "ended".
  function handleNativeEnded() {
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play();
    setElapsed(0);
  }

  function togglePlay() {
    const el = mediaRef.current;
    if (!el) return;
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
          aria-label={isPlaying ? "Pause preview" : "Play preview"}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-canvas flex-shrink-0"
        >
          {isPlaying ? (
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
      <p className="text-xs text-ink-muted mt-1">Preview — {PREVIEW_SECONDS}s, looping</p>
    </div>
  );
}
