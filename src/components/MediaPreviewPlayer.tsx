// src/components/MediaPreviewPlayer.tsx
//
// NOTE: this component itself isn't currently rendered anywhere — a
// Media project's play button now lives directly on the card's own
// thumbnail (see MediaHeroPlayer in ProjectCard.tsx), which inlines
// its own play/pause + loop/cap logic against that thumbnail rather
// than importing this. PREVIEW_SECONDS below is still the shared
// source of truth for the preview cap, which is why the import
// remains. Left in place rather than deleted in case a future
// context (e.g. a standalone lightbox/modal player) wants exactly
// this "video with a small control row underneath" shape again.
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
// SongCoverPlayer's audio+cover loop in ProjectCard. Deliberately
// does NOT use the native `controls` UI — a native scrub bar would
// let a visitor drag past the cap and see (or hear) exactly how long
// the real file is, which defeats the point of it being a preview
// rather than the full asset. For video, the play/pause control sits
// directly on the video frame itself (tap-to-toggle, like
// SongCoverPlayer's cover-art button) rather than in a separate row
// underneath — the frame already IS the thumbnail, so a second control
// surface below it would just be dead space. Audio has no frame to put
// a button on, so it keeps its own compact bar (button + progress +
// elapsed time) instead.
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

  if (kind === "video") {
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause preview" : "Play preview"}
          className="relative block w-full rounded-lg overflow-hidden bg-canvas"
        >
          <video
            ref={(el) => {
              mediaRef.current = el;
            }}
            src={src}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleNativeEnded}
            playsInline
            className="w-full max-h-72 bg-canvas"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-ink/0 hover:bg-ink/10 transition-colors">
            <span className="flex items-center justify-center w-14 h-14 rounded-full bg-ink/60 text-canvas backdrop-blur-sm">
              {isPlaying ? (
                <Pause size={22} fill="currentColor" />
              ) : (
                <Play size={22} fill="currentColor" className="ml-1" />
              )}
            </span>
          </span>
        </button>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
            <div className="h-full bg-accent transition-[width]" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-xs text-ink-muted tabular-nums flex-shrink-0">
            0:{String(elapsedSeconds).padStart(2, "0")} / 0:{PREVIEW_SECONDS}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <audio
        ref={(el) => {
          mediaRef.current = el;
        }}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleNativeEnded}
        className="hidden"
      />
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
    </div>
  );
}
