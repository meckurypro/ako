// src/components/VoicePreviewBar.tsx
import { useEffect, useRef, useState } from "react";
import { Trash2, Play, Pause, Send } from "lucide-react";
import { formatVoiceDuration } from "../lib/voiceNotes";
import { VoiceWaveform } from "./VoiceWaveform";

const FLAT_PEAKS = Array(40).fill(0.12);

interface VoicePreviewBarProps {
  url: string;
  durationSec: number;
  /** Empty while still computing — see useVoiceRecorder's PreviewData
   *  comment. Renders flat placeholder bars until it fills in. */
  peaks: number[];
  sending: boolean;
  onDiscard: () => void;
  onSend: () => void;
}

/**
 * WhatsApp's "listen before you send" step: play/pause, a real
 * waveform you can tap to scrub, a trash button to bin it, and the
 * send button — the two things the old version of this bar was
 * missing entirely.
 */
export function VoicePreviewBar({ url, durationSec, peaks, sending, onDiscard, onSend }: VoicePreviewBarProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);

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
  }, [url]);

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

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
      <button type="button" onClick={onDiscard} className="text-danger flex-shrink-0 p-1" aria-label="Discard recording">
        <Trash2 size={20} />
      </button>
      <div className="flex-1 min-w-0 bg-surface rounded-full pl-1.5 pr-3 py-1.5 flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggle}
          className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center flex-shrink-0"
          aria-label={playing ? "Pause preview" : "Play preview"}
        >
          {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
        </button>
        <VoiceWaveform
          levels={peaks.length ? peaks : FLAT_PEAKS}
          progress={progress}
          filledColor="bg-accent"
          mutedColor="bg-ink-muted/25"
          onSeek={peaks.length ? seek : undefined}
        />
        <span className="text-[11px] tabular-nums flex-shrink-0 text-ink-muted">
          {formatVoiceDuration(playing || elapsed > 0 ? elapsed : durationSec)}
        </span>
      </div>
      <button
        type="button"
        onClick={onSend}
        disabled={sending}
        className="bg-accent text-white rounded-full p-2.5 flex-shrink-0 disabled:opacity-50"
        aria-label="Send voice message"
      >
        <Send size={18} />
      </button>
    </div>
  );
}
