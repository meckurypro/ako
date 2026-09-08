// src/components/VoiceMessageBubble.tsx
import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { formatVoiceDuration } from "../lib/voiceNotes";
import { computeWaveformPeaks } from "../lib/waveform";
import { VoiceWaveform } from "./VoiceWaveform";

const FLAT_PEAKS = Array(40).fill(0.12);

interface VoiceMessageBubbleProps {
  url: string;
  durationSec: number;
  /** Waveform bar heights (0..1). Voice notes sent going forward
   *  always have this; omit it (older messages) and the bubble fetches
   *  and decodes the audio itself to draw the same waveform. */
  peaks?: number[];
  /** Controls color: white-on-accent for the sender's own bubble,
   *  accent-on-surface for the other participant's. */
  isMine: boolean;
}

/**
 * WhatsApp-style voice note bubble: a round play/pause button, a real
 * amplitude waveform (tap anywhere on it to seek), and elapsed/total
 * time — backed by a plain, hidden <audio> element rather than the
 * browser's native controls.
 */
export function VoiceMessageBubble({ url, durationSec, peaks, isMine }: VoiceMessageBubbleProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [fetchedPeaks, setFetchedPeaks] = useState<number[] | null>(null);

  // Older voice notes sent before waveform peaks were stored don't
  // have `peaks` — fetch and decode the audio once, client-side, so
  // they still get the same look instead of a flat/plain bar.
  useEffect(() => {
    if (peaks?.length) return;
    let cancelled = false;
    fetch(url)
      .then((r) => r.blob())
      .then((blob) => computeWaveformPeaks(blob))
      .then((computed) => {
        if (!cancelled) setFetchedPeaks(computed);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url, peaks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setElapsed(audio.currentTime);
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setElapsed(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
    }
  }

  function seek(ratio: number) {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
    setElapsed(audio.currentTime);
  }

  const barLevels = peaks?.length ? peaks : fetchedPeaks ?? FLAT_PEAKS;
  const mutedColor = isMine ? "bg-white/35" : "bg-ink-muted/25";
  const filledColor = isMine ? "bg-white" : "bg-accent";
  const buttonClass = isMine ? "bg-white text-accent" : "bg-accent text-white";

  return (
    <div className="flex items-center gap-2.5 min-w-[200px] py-0.5">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
      <button
        type="button"
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${buttonClass}`}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
      >
        {playing ? (
          <Pause size={15} fill="currentColor" />
        ) : (
          <Play size={15} fill="currentColor" className="ml-0.5" />
        )}
      </button>
      <VoiceWaveform levels={barLevels} progress={progress} filledColor={filledColor} mutedColor={mutedColor} onSeek={seek} />
      <span className="text-[11px] tabular-nums flex-shrink-0 opacity-80">
        {formatVoiceDuration(playing || elapsed > 0 ? elapsed : durationSec)}
      </span>
    </div>
  );
}
