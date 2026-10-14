// src/components/VoiceRecordingBar.tsx
// Shown over the composer while recording, WhatsApp-style.
//   Holding: one pill with pulsing dot + timer · "‹ Slide to cancel" (breathes, follows your finger) ·
//            a big mic that follows your finger · a tall lock capsule standing above it fills as you slide up.
//   Locked:  a panel — row 1: timer + live waveform; row 2: trash · big "Pause" pill · send.
//            (Without `onSend` — rooms — it keeps the original pause/stop layout.)
import { Trash2, Pause, Play, Square, Lock, ChevronLeft, ChevronUp, Mic, Send } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { formatVoiceDuration } from "../lib/voiceNotes";
import { useRecorderLive, type RecorderLiveStore } from "../lib/recorderLiveStore";
import { VoiceWaveform } from "./VoiceWaveform";

interface VoiceRecordingBarProps {
  locked: boolean;
  paused: boolean;
  /** Timer, drag offset, live waveform and playhead — read here (not in the screen) so only this bar re-renders per tick. */
  live: RecorderLiveStore;
  cancelThresholdPx: number;
  lockThresholdPx: number;
  onCancel: () => void;
  onTogglePause: () => void;
  onStop: () => void;
  /** When given, the locked bar shows a send button (record → send in one tap, like WhatsApp). */
  onSend?: () => void;
  /** When given and paused, shows a play button that opens the draft preview (ends the recording). */
  onPreview?: () => void;
  /** When given and paused, the play button plays back what's recorded so far WITHOUT ending the recording. */
  onTogglePlayback?: () => void;
  /** True while that "listen back" clip is playing. */
  playingPaused?: boolean;
  /** Scrub the paused clip (0..1). */
  onSeekPlayback?: (ratio: number) => void;
}

function VoiceRecordingBarImpl({
  locked,
  paused,
  live,
  cancelThresholdPx,
  lockThresholdPx,
  onCancel,
  onTogglePause,
  onStop,
  onSend,
  onPreview,
  onTogglePlayback,
  playingPaused = false,
  onSeekPlayback,
}: VoiceRecordingBarProps) {
  const { elapsedMs, drag, levels: liveLevels, playbackMs } = useRecorderLive(live);
  const [scrub, setScrub] = useState<number | null>(null);
  // Paused: draw the WHOLE recording (not just the rolling live window) so the playhead has something to scrub.
  const pausedPeaks = useMemo(() => {
    if (!paused || live.history.length === 0) return null;
    const BARS = 48;
    const h = live.history;
    return Array.from({ length: BARS }, (_, i) => {
      const from = Math.floor((i / BARS) * h.length);
      const to = Math.max(from + 1, Math.floor(((i + 1) / BARS) * h.length));
      let m = 0;
      for (let k = from; k < to && k < h.length; k++) if (h[k] > m) m = h[k];
      return Math.max(0.08, m);
    });
  }, [paused, live]);
  const canScrub = paused && !!onSeekPlayback && !!pausedPeaks;
  const pausedProgress = elapsedMs > 0 ? Math.min(1, playbackMs / elapsedMs) : 0;  if (locked && onSend) {
    return (
      <div className="rounded-t-3xl border-t border-border bg-surface px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <span className="tabular-nums text-base text-ink flex-shrink-0">
            {formatVoiceDuration((scrub !== null ? scrub * elapsedMs : playbackMs > 0 || playingPaused ? playbackMs : elapsedMs) / 1000)}
          </span>
          {paused && (onTogglePlayback || onPreview) && (
            <button
              type="button"
              onClick={onTogglePlayback ?? onPreview}
              className="w-8 h-8 rounded-full bg-ink-muted/15 text-ink-muted flex items-center justify-center flex-shrink-0"
              aria-label={playingPaused ? "Pause playback" : "Play back recording"}
            >
              {playingPaused ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            </button>
          )}
          {canScrub ? (
            <VoiceWaveform
              levels={pausedPeaks!}
              progress={scrub ?? pausedProgress}
              filledColor="bg-ink"
              mutedColor="bg-ink-muted/40"
              thumbColor="bg-tick-blue"
              heightClass="h-8"
              onSeek={onSeekPlayback}
              onScrub={setScrub}
            />
          ) : (
            <VoiceWaveform levels={liveLevels} filledColor="bg-ink-muted" mutedColor="bg-ink-muted/40" heightClass="h-8" />
          )}
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button type="button" onClick={onCancel} className="w-14 h-14 rounded-full bg-danger/15 text-danger flex items-center justify-center flex-shrink-0 active:scale-95" aria-label="Delete recording">
            <Trash2 size={24} />
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            className="flex-1 min-w-0 h-14 rounded-full bg-ink-muted/15 hover:bg-ink-muted/25 text-ink flex items-center justify-center gap-3 text-base font-medium"
            aria-label={paused ? "Resume recording" : "Pause recording"}
          >
            {paused ? <Mic size={22} /> : <Pause size={22} />}
            <span>{paused ? "Resume" : "Pause"}</span>
          </button>
          <button
            type="button"
            onClick={onSend}
            className="w-14 h-14 rounded-full bg-ink text-canvas flex items-center justify-center flex-shrink-0 hover:opacity-90 active:scale-95"
            aria-label="Send voice message"
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    );
  }

  if (locked) {
    // Original layout (rooms): discard · waveform · pause/resume · stop-to-preview.
    return (
      <div className="px-4 py-3 flex items-center gap-2">
        <button type="button" onClick={onCancel} className="w-9 h-9 rounded-full bg-danger/10 text-danger flex items-center justify-center flex-shrink-0" aria-label="Discard recording">
          <Trash2 size={18} />
        </button>
        <div className="flex-1 flex items-center gap-2 text-sm text-ink min-w-0">
          <VoiceWaveform levels={liveLevels} filledColor="bg-accent" mutedColor="bg-ink-muted/25" heightClass="h-5" />
          <span className="tabular-nums flex-shrink-0 text-ink-muted text-[13px]">{formatVoiceDuration(elapsedMs / 1000)}</span>
        </div>
        <button
          type="button"
          onClick={onTogglePause}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface text-ink text-sm flex-shrink-0"
          aria-label={paused ? "Resume recording" : "Pause recording"}
        >
          {paused ? <Mic size={16} /> : <Pause size={16} />}
          <span>{paused ? "Resume" : "Pause"}</span>
        </button>
        <button type="button" onClick={onStop} className="bg-ink text-canvas rounded-full p-2.5 flex-shrink-0" aria-label="Stop recording">
          <Square size={16} fill="currentColor" />
        </button>
      </div>
    );
  }

  const cancelProgress = Math.min(1, Math.abs(drag.x) / cancelThresholdPx);
  const lockProgress = Math.min(1, drag.y / lockThresholdPx);
  const willCancel = cancelProgress > 0.7;
  const dx = Math.max(-cancelThresholdPx, drag.x);
  const dy = Math.min(lockThresholdPx, Math.max(0, drag.y));

  return (
    <div className="relative px-3 py-3">
      {/* One pill: dot + timer on the left, "Slide to cancel" in the middle; the mic overlaps its right end. */}
      <div className="h-12 flex items-center gap-3 rounded-full bg-surface pl-4 pr-16">
        <span className="w-2.5 h-2.5 rounded-full bg-danger flex-shrink-0 animate-pulse" />
        <span className="tabular-nums text-base text-ink-muted flex-shrink-0">{formatVoiceDuration(elapsedMs / 1000)}</span>
        <div className="flex-1 min-w-0 flex justify-center">
          <div
            className={`flex items-center gap-1 text-base animate-pulse ${willCancel ? "text-danger" : "text-ink-muted"}`}
            style={{ transform: `translateX(${dx}px)`, opacity: 1 - cancelProgress * 0.85 }}
          >
            <ChevronLeft size={16} />
            <span className="whitespace-nowrap">Slide to cancel</span>
          </div>
        </div>
      </div>

      {/* Tall lock capsule standing on the mic — it tints as the finger slides up into it. */}
      <div
        className={`pointer-events-none absolute w-12 flex flex-col items-center gap-3 pt-4 rounded-full border transition-colors ${
          lockProgress >= 1 ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-ink"
        }`}
        style={{ right: 12, bottom: 30, height: 112, opacity: 0.7 + lockProgress * 0.3, transform: `translateY(${-lockProgress * 12}px)` }}
      >
        <Lock size={20} />
        <ChevronUp size={16} className="text-ink-muted" />
      </div>

      {/* The big mic swells under the finger and follows it. */}
      <div
        className={`pointer-events-none absolute w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${willCancel ? "bg-danger text-white" : "bg-ink text-canvas"}`}
        style={{ right: 12, bottom: 12, transform: `translate(${dx}px, ${-dy}px) scale(1.5)` }}
      >
        <Mic size={22} />
      </div>
    </div>
  );
}

export const VoiceRecordingBar = memo(VoiceRecordingBarImpl);
