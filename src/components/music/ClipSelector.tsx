// src/components/music/ClipSelector.tsx
//
// "Select the best part of the song" step of Publish Music to Akọ
// (see done/AKO_MUSIC_CATALOGUE_AND_CREATOR_DISCOVERY_SYSTEM.md §8).
// Real waveform (computed from the actually-decoded audio, never
// faked), a draggable up-to-60s selection window, preview playback,
// and a confirm step that slices + encodes the real derived clip.

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Minus, Plus } from "lucide-react";
import { computeBufferPeaks, decodeAudioFile, sliceAndEncodeWav, type DecodedAudio } from "../../lib/audioClip";

const MIN_DURATION = 5;
const MAX_DURATION = 30;
const DURATION_STEP = 5;
const DEFAULT_DURATION = 30;

interface ClipSelectorProps {
  /** URL of the source Audio Project file — fetched once, decoded once. */
  audioUrl: string;
  onConfirm: (result: { startSeconds: number; durationSeconds: number; blob: Blob }) => void;
  onCancel: () => void;
}

export function ClipSelector({ audioUrl, onConfirm, onCancel }: ClipSelectorProps) {
  const [decoded, setDecoded] = useState<DecodedAudio | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [start, setStart] = useState(0);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEncoding, setIsEncoding] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const dragRef = useRef<{ startX: number; startValue: number } | null>(null);

  // Decode once on mount — real waveform, computed from the real file.
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    (async () => {
      try {
        const res = await fetch(audioUrl);
        const blob = await res.blob();
        const audio = await decodeAudioFile(blob);
        if (cancelled) return;
        setDecoded(audio);
        const initialDuration = Math.min(DEFAULT_DURATION, audio.durationSeconds);
        setDuration(initialDuration);
        setStart(0);
      } catch {
        if (!cancelled) setLoadError("Couldn't load this track's audio. Try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  const peaks = useMemo(() => (decoded ? computeBufferPeaks(decoded.buffer) : []), [decoded]);
  const totalDuration = decoded?.durationSeconds ?? 0;

  function clampStart(value: number, forDuration = duration) {
    return Math.max(0, Math.min(value, Math.max(0, totalDuration - forDuration)));
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!trackRef.current) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startValue: start };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current || !trackRef.current) return;
    const trackWidth = trackRef.current.getBoundingClientRect().width;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaSeconds = (deltaX / trackWidth) * totalDuration;
    setStart(clampStart(dragRef.current.startValue + deltaSeconds));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function adjustDuration(delta: number) {
    setDuration((prev) => {
      const next = Math.max(MIN_DURATION, Math.min(MAX_DURATION, prev + delta));
      setStart((prevStart) => clampStart(prevStart, next));
      return next;
    });
  }

  function togglePreview() {
    const el = audioElRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      return;
    }
    el.currentTime = start;
    el.play().catch(() => {});
    setIsPlaying(true);
  }

  // Stop preview automatically at the end of the selected window —
  // never plays past what the audience would actually hear.
  useEffect(() => {
    const el = audioElRef.current;
    if (!el) return;
    function onTimeUpdate() {
      if (el!.currentTime >= start + duration) {
        el!.pause();
        setIsPlaying(false);
      }
    }
    el.addEventListener("timeupdate", onTimeUpdate);
    return () => el.removeEventListener("timeupdate", onTimeUpdate);
  }, [start, duration]);

  async function handleConfirm() {
    if (!decoded) return;
    setIsEncoding(true);
    try {
      const blob = sliceAndEncodeWav(decoded.buffer, start, duration);
      onConfirm({ startSeconds: start, durationSeconds: duration, blob });
    } catch {
      setLoadError("Couldn't prepare that clip. Try a different range.");
    } finally {
      setIsEncoding(false);
    }
  }

  const selectionLeftPct = totalDuration > 0 ? (start / totalDuration) * 100 : 0;
  const selectionWidthPct = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;

  return (
    <div className="px-4 py-4">
      <audio ref={audioElRef} src={audioUrl} preload="none" />

      <h3 className="font-display text-base text-ink mb-1">Pick the best 30 seconds</h3>
      <p className="text-xs text-ink-muted mb-4">Drag the highlighted section over the part you want people to hear.</p>

      {loadError && <p className="text-sm text-danger mb-3">{loadError}</p>}

      {!decoded && !loadError && (
        <div className="h-20 rounded-xl bg-surface border border-border animate-pulse" />
      )}

      {decoded && (
        <>
          <div
            ref={trackRef}
            className="relative h-20 rounded-xl bg-surface border border-border overflow-hidden touch-none select-none"
          >
            <div className="absolute inset-0 flex items-center gap-[1.5px] px-1">
              {peaks.map((p, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full bg-ink-muted/30"
                  style={{ height: `${Math.max(8, p * 100)}%` }}
                />
              ))}
            </div>

            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="absolute inset-y-0 rounded-lg bg-accent/25 border-2 border-accent cursor-grab active:cursor-grabbing"
              style={{ left: `${selectionLeftPct}%`, width: `${selectionWidthPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-3">
            <button
              onClick={togglePreview}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent-soft text-accent text-sm font-medium"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {isPlaying ? "Pause" : "Preview"}
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => adjustDuration(-DURATION_STEP)}
                disabled={duration <= MIN_DURATION}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-ink-muted disabled:opacity-40"
                aria-label="Shorter clip"
              >
                <Minus size={14} />
              </button>
              <span className="text-sm text-ink tabular-nums w-16 text-center">{duration}s</span>
              <button
                onClick={() => adjustDuration(DURATION_STEP)}
                disabled={duration >= MAX_DURATION || duration >= totalDuration}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-ink-muted disabled:opacity-40"
                aria-label="Longer clip"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-3 mt-5">
        <button onClick={onCancel} className="flex-1 py-3 rounded-full border border-border text-ink text-sm font-medium">
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!decoded || isEncoding}
          className="flex-1 py-3 rounded-full bg-accent text-canvas text-sm font-medium disabled:opacity-50"
        >
          {isEncoding ? "Preparing…" : "Use this clip"}
        </button>
      </div>
    </div>
  );
}
