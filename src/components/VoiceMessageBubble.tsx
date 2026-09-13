// src/components/VoiceMessageBubble.tsx
import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { formatVoiceDuration } from "../lib/voiceNotes";
import { computeWaveformPeaks } from "../lib/waveform";
import {
  announcePlaying,
  clearPlaying,
  clearRememberedPosition,
  getRememberedPosition,
  getPreferredPlaybackSpeed,
  nextPlaybackSpeed,
  setPreferredPlaybackSpeed,
  setRememberedPosition,
  type PlaybackSpeed,
} from "../lib/voicePlayback";
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
 * amplitude waveform (tap anywhere on it to seek), elapsed/total time,
 * and a speed toggle — backed by a plain, hidden <audio> element
 * rather than the browser's native controls.
 *
 * Two cross-bubble behaviors live here, coordinated through
 * lib/voicePlayback.ts rather than local state: starting playback
 * pauses whatever other voice note was playing (only one plays at a
 * time, matching WhatsApp), and pausing mid-note remembers where you
 * left off so reopening the chat resumes there instead of from zero.
 */
export function VoiceMessageBubble({ url, durationSec, peaks, isMine }: VoiceMessageBubbleProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [fetchedPeaks, setFetchedPeaks] = useState<number[] | null>(null);
  const [speed, setSpeed] = useState<PlaybackSpeed>(() => getPreferredPlaybackSpeed());

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

  // Resume from a remembered position (if this exact note was paused
  // mid-listen earlier in the session) as soon as duration is known —
  // seeking before metadata loads is a silent no-op in every browser.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const applyRememberedPosition = () => {
      const remembered = getRememberedPosition(url);
      if (remembered > 0 && remembered < audio.duration) {
        audio.currentTime = remembered;
        setElapsed(remembered);
        setProgress(audio.duration ? remembered / audio.duration : 0);
      }
    };
    audio.addEventListener("loadedmetadata", applyRememberedPosition);
    return () => audio.removeEventListener("loadedmetadata", applyRememberedPosition);
  }, [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
  }, [speed]);

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
      clearRememberedPosition(url);
      clearPlaying(pause);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Pausing (including via another bubble starting, tab close, or
  // unmount-while-playing) always remembers where this note stopped.
  function pause() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
    if (audio.currentTime > 0 && audio.currentTime < audio.duration) {
      setRememberedPosition(url, audio.currentTime);
    }
    clearPlaying(pause);
  }

  useEffect(() => {
    // Leaving the chat (or the message scrolling out and the
    // component unmounting) mid-playback shouldn't keep audio
    // running in the background with no visible control for it.
    return () => {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        if (audio.currentTime > 0 && audio.currentTime < audio.duration) {
          setRememberedPosition(url, audio.currentTime);
        }
        audio.pause();
      }
      clearPlaying(pause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      pause();
    } else {
      announcePlaying(pause);
      audio.playbackRate = speed;
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
    if (playing) setRememberedPosition(url, audio.currentTime);
  }

  function cycleSpeed() {
    const next = nextPlaybackSpeed(speed);
    setSpeed(next);
    setPreferredPlaybackSpeed(next);
  }

  const barLevels = peaks?.length ? peaks : fetchedPeaks ?? FLAT_PEAKS;
  const mutedColor = isMine ? "bg-white/35" : "bg-ink-muted/25";
  const filledColor = isMine ? "bg-white" : "bg-accent";
  const buttonClass = isMine ? "bg-white text-accent" : "bg-accent text-white";
  const chipClass = isMine ? "bg-white/20 text-white" : "bg-accent/10 text-accent";

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
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <span className="text-[11px] tabular-nums opacity-80">
          {formatVoiceDuration(playing || elapsed > 0 ? elapsed : durationSec)}
        </span>
        {/* Speed is discoverable but stays out of the way until a note
           has actually started — showing "1x" on every idle bubble in
           a long chat is noise, not a control. */}
        {(playing || elapsed > 0) && (
          <button
            type="button"
            onClick={cycleSpeed}
            className={`text-[10px] font-semibold leading-none px-1.5 py-0.5 rounded-full tabular-nums ${chipClass}`}
            aria-label={`Playback speed, currently ${speed}x. Tap to change.`}
          >
            {speed}x
          </button>
        )}
      </div>
    </div>
  );
}
