// src/components/VoicePreviewBar.tsx
import { useEffect, useRef, useState } from "react";
import { Trash2, Play, Pause, Send } from "lucide-react";
import { formatVoiceDuration } from "../lib/voiceNotes";
import { durationOf, resolveInfiniteDuration } from "../lib/audioDuration";
import { VoiceWaveform } from "./VoiceWaveform";

const FLAT_PEAKS = Array(40).fill(0.12);

interface VoicePreviewBarProps {
  url: string;
  durationSec: number;
  /** Empty while still computing — see useVoiceRecorder's PreviewData
   *  comment. Renders flat placeholder bars until it fills in. */
  peaks: number[];
  sending: boolean;
  /** WhatsApp's "1" badge — toggles the note to play once for the
   *  recipient. Purely a send-time flag; VoiceMessageBubble is what
   *  actually enforces the single playback. Omitted entirely (no
   *  badge rendered) for contexts where it doesn't make sense, like
   *  a room lecture post. */
  viewOnce?: boolean;
  onToggleViewOnce?: () => void;
  onDiscard: () => void;
  onSend: () => void;
}

/**
 * WhatsApp's "listen before you send" step: play/pause, a real
 * waveform you can tap to scrub, a trash button to bin it, and the
 * send button — the two things the old version of this bar was
 * missing entirely.
 */
export function VoicePreviewBar({
  url,
  durationSec,
  peaks,
  sending,
  viewOnce,
  onToggleViewOnce,
  onDiscard,
  onSend,
}: VoicePreviewBarProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const resolving = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // A MediaRecorder blob has no duration header (Infinity) — learn the real one so scrubbing works.
    const onMeta = () => {
      if (audio.duration !== Infinity) return;
      resolving.current = true;
      resolveInfiniteDuration(audio, () => {
        resolving.current = false;
      });
    };
    const onTime = () => {
      if (resolving.current) return;
      const total = durationOf(audio, durationSec);
      setElapsed(audio.currentTime);
      setProgress(total ? Math.min(1, audio.currentTime / total) : 0);
    };
    audio.addEventListener("loadedmetadata", onMeta);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setElapsed(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, [url, durationSec]);

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
    if (!audio) return;
    audio.currentTime = ratio * durationOf(audio, durationSec);
    setProgress(ratio);
    setElapsed(audio.currentTime);
  }

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
      <button
        type="button"
        onClick={onDiscard}
        className="w-9 h-9 rounded-full bg-danger/10 text-danger flex items-center justify-center flex-shrink-0"
        aria-label="Discard recording"
      >
        <Trash2 size={18} />
      </button>
      <div className="flex-1 min-w-0 bg-surface rounded-full pl-1.5 pr-2 py-1.5 flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggle}
          className="w-9 h-9 rounded-full bg-cta text-white flex items-center justify-center flex-shrink-0"
          aria-label={playing ? "Pause preview" : "Play preview"}
        >
          {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
        </button>
        <VoiceWaveform
          levels={peaks.length ? peaks : FLAT_PEAKS}
          progress={scrub ?? progress}
          filledColor="bg-accent"
          mutedColor="bg-ink-muted/25"
          thumbColor="bg-tick-blue"
          onSeek={seek}
          onScrub={setScrub}
        />
        <span className="text-[11px] tabular-nums flex-shrink-0 text-ink-muted">
          {formatVoiceDuration(scrub !== null ? scrub * durationOf(audioRef.current, durationSec) : playing || elapsed > 0 ? elapsed : durationSec)}
        </span>
        {onToggleViewOnce && (
          <button
            type="button"
            onClick={onToggleViewOnce}
            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold transition-colors ${
              viewOnce ? "bg-cta text-white" : "bg-ink-muted/15 text-ink-muted"
            }`}
            aria-label={viewOnce ? "View once enabled — tap to allow replay" : "Enable view once"}
            aria-pressed={viewOnce}
          >
            1
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onSend}
        disabled={sending}
        className="bg-cta text-white rounded-full p-2.5 flex-shrink-0 disabled:opacity-50"
        aria-label="Send voice message"
      >
        <Send size={18} />
      </button>
    </div>
  );
}
