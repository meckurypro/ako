// src/components/VoiceMessageBubble.tsx
import { useEffect, useRef, useState } from "react";
import { Play, Pause, EyeOff, Mic } from "lucide-react";
import { formatVoiceDuration } from "../lib/voiceNotes";
import { computeWaveformPeaks } from "../lib/waveform";
import { getSignedAudioUrl } from "../lib/signedAudioUrl";
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
import { Avatar } from "./Avatar";

const FLAT_PEAKS = Array(40).fill(0.12);

interface VoiceMessageBubbleProps {
  /** Playable immediately — the optimistic bubble's local blob: URL.
   *  Mutually exclusive with `path`; see lib/voiceNotes.ts. */
  url?: string;
  /** Storage path in the private "audio" bucket — resolved to a
   *  short-lived signed URL below rather than used directly. */
  path?: string;
  durationSec: number;
  /** Waveform bar heights (0..1). Voice notes sent going forward
   *  always have this; omit it (older messages) and the bubble fetches
   *  and decodes the audio itself to draw the same waveform. */
  peaks?: number[];
  /** Controls color: white-on-accent for the sender's own bubble,
   *  accent-on-surface for the other participant's. */
  isMine: boolean;
  /** WhatsApp-style "view once" — the recipient gets a single
   *  playthrough, then the bubble collapses to a spent placeholder.
   *  The sender's own copy stays fully replayable, so they can always
   *  confirm what they sent. */
  viewOnce?: boolean;
  /** DB-backed (message_user_state.opened_once_at) — set once the
   *  current user has already played a view-once note. Passed down
   *  from MessageThread's userStates map rather than tracked locally,
   *  so it's the same "already played" fact on every device/session,
   *  not just this browser. Ignored when `viewOnce` is falsy. */
  openedOnceAt?: string | null;
  /** Fired the moment a view-once note finishes playing, so the
   *  caller can persist it (useMarkVoiceNoteOpened). Never called for
   *  the sender's own bubble or a non-view-once note. */
  onOpened?: () => void;
  /** Sender's avatar — small circular thumbnail on the waveform side
   *  of the bubble, matching WhatsApp's voice-note treatment. Omitted
   *  entirely (no thumbnail) if not provided, e.g. in a room lecture
   *  post where there's no single 1:1 sender photo to anchor. */
  senderAvatarUrl?: string | null;
  senderName?: string;
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
 * Both are keyed by `stableKey` (the storage path, or the local blob
 * URL for an optimistic bubble) rather than the resolved playback URL
 * below, since a signed URL is re-issued periodically and would churn
 * that key on every re-sign.
 */
export function VoiceMessageBubble({
  url,
  path,
  durationSec,
  peaks,
  isMine,
  viewOnce,
  openedOnceAt,
  onOpened,
  senderAvatarUrl,
  senderName,
}: VoiceMessageBubbleProps) {
  const stableKey = path ?? url ?? "";
  // Recipient-only: once the DB says this exact note has been opened,
  // it stays spent — same fact on every device, not a per-browser flag.
  const enforceViewOnce = !!viewOnce && !isMine;
  const spent = enforceViewOnce && !!openedOnceAt;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [fetchedPeaks, setFetchedPeaks] = useState<number[] | null>(null);
  const [speed, setSpeed] = useState<PlaybackSpeed>(() => getPreferredPlaybackSpeed());
  // `url` is already playable as-is (optimistic local blob). A `path`
  // needs a signed URL fetched first — the bucket is private, so
  // there's nothing playable to point <audio> at until this resolves.
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(url ?? null);

  useEffect(() => {
    if (url) {
      setResolvedUrl(url);
      return;
    }
    if (!path) return;
    let cancelled = false;
    getSignedAudioUrl(path).then((signed) => {
      if (!cancelled) setResolvedUrl(signed);
    });
    return () => {
      cancelled = true;
    };
  }, [url, path]);

  // Older voice notes sent before waveform peaks were stored don't
  // have `peaks` — fetch and decode the audio once, client-side, so
  // they still get the same look instead of a flat/plain bar.
  useEffect(() => {
    if (peaks?.length || !resolvedUrl) return;
    let cancelled = false;
    fetch(resolvedUrl)
      .then((r) => r.blob())
      .then((blob) => computeWaveformPeaks(blob))
      .then((computed) => {
        if (!cancelled) setFetchedPeaks(computed);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [resolvedUrl, peaks]);

  // Resume from a remembered position (if this exact note was paused
  // mid-listen earlier in the session) as soon as duration is known —
  // seeking before metadata loads is a silent no-op in every browser.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const applyRememberedPosition = () => {
      const remembered = getRememberedPosition(stableKey);
      if (remembered > 0 && remembered < audio.duration) {
        audio.currentTime = remembered;
        setElapsed(remembered);
        setProgress(audio.duration ? remembered / audio.duration : 0);
      }
    };
    audio.addEventListener("loadedmetadata", applyRememberedPosition);
    return () => audio.removeEventListener("loadedmetadata", applyRememberedPosition);
  }, [stableKey, resolvedUrl]);

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
      clearRememberedPosition(stableKey);
      clearPlaying(pause);
      if (enforceViewOnce) onOpened?.();
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKey, resolvedUrl]);

  // Pausing (including via another bubble starting, tab close, or
  // unmount-while-playing) always remembers where this note stopped.
  function pause() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
    if (audio.currentTime > 0 && audio.currentTime < audio.duration) {
      setRememberedPosition(stableKey, audio.currentTime);
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
          setRememberedPosition(stableKey, audio.currentTime);
        }
        audio.pause();
      }
      clearPlaying(pause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKey]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio || !resolvedUrl) return; // not yet signed, or signing failed — nothing to play
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
    if (playing) setRememberedPosition(stableKey, audio.currentTime);
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

  // Recipient already opened this view-once note — collapse to a
  // spent placeholder rather than the normal playable bubble. Matches
  // WhatsApp's own "Voice message set to view once" copy re-purposed
  // as the after-the-fact state (image 7 in the reference set).
  if (spent) {
    return (
      <div className={`flex items-center gap-2 py-0.5 text-sm italic ${isMine ? "text-white/70" : "text-ink-muted"}`}>
        <EyeOff size={15} className="flex-shrink-0" />
        <span>Opened</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 min-w-[200px] py-0.5">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      {resolvedUrl && <audio ref={audioRef} src={resolvedUrl} preload="metadata" className="hidden" />}
      {senderAvatarUrl !== undefined && (
        <div className="relative flex-shrink-0">
          <Avatar src={senderAvatarUrl} name={senderName ?? "?"} size="sm" />
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ${
              isMine ? "bg-white text-accent ring-accent" : "bg-accent text-white ring-surface"
            }`}
          >
            <Mic size={9} />
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={!resolvedUrl}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${buttonClass} ${!resolvedUrl ? "opacity-50" : ""}`}
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
        <span className="text-[11px] tabular-nums opacity-80 flex items-center gap-1">
          {viewOnce && (
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold leading-none ${
                isMine ? "bg-white/25" : "bg-accent/15 text-accent"
              }`}
              aria-label="View once"
            >
              1
            </span>
          )}
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
