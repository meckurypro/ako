// src/components/VoiceMessageBubble.tsx
import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { formatVoiceDuration } from "../lib/voiceNotes";

interface VoiceMessageBubbleProps {
  url: string;
  durationSec: number;
  /** Controls color: white-on-accent for the sender's own bubble,
   *  accent-on-surface for the other participant's (and for the
   *  compose-bar preview, which passes false). */
  isMine: boolean;
}

/**
 * WhatsApp-style voice note: a round play/pause button, a thin
 * progress bar, and elapsed/total time — backed by a plain, hidden
 * <audio> element rather than the browser's native controls.
 */
export function VoiceMessageBubble({ url, durationSec, isMine }: VoiceMessageBubbleProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
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

  const trackColor = isMine ? "bg-white/35" : "bg-ink-muted/25";
  const fillColor = isMine ? "bg-white" : "bg-accent";
  const buttonClass = isMine ? "bg-white text-accent" : "bg-accent text-white";

  return (
    <div className="flex items-center gap-2.5 min-w-[172px] py-0.5">
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
      <div className="flex-1 min-w-0">
        <div className={`h-1 rounded-full overflow-hidden ${trackColor}`}>
          <div className={`h-full rounded-full ${fillColor}`} style={{ width: `${Math.min(progress * 100, 100)}%` }} />
        </div>
      </div>
      <span className="text-[11px] tabular-nums flex-shrink-0 opacity-80">
        {formatVoiceDuration(playing || elapsed > 0 ? elapsed : durationSec)}
      </span>
    </div>
  );
}
