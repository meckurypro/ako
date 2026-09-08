// src/components/VoiceRecordingBar.tsx
import { Trash2, Play, Pause, Square, Lock, ChevronsLeft, Mic } from "lucide-react";
import { formatVoiceDuration } from "../lib/voiceNotes";
import { VoiceWaveform } from "./VoiceWaveform";

interface VoiceRecordingBarProps {
  locked: boolean;
  paused: boolean;
  elapsedMs: number;
  drag: { x: number; y: number };
  cancelThresholdPx: number;
  lockThresholdPx: number;
  liveLevels: number[];
  onCancel: () => void;
  onTogglePause: () => void;
  onStop: () => void;
}

/**
 * Replaces the text input row for the entire duration of a recording.
 * Two looks, matching WhatsApp exactly:
 *
 * - Holding (finger still down): timer + live waveform on the left,
 *   "◀ Slide to cancel" fading out as you drag left, a lock pill
 *   above the mic that rises as you drag up. The mic icon itself is
 *   purely decorative here — the actual finger tracking is window-level
 *   (see useVoiceRecorder), so it doesn't need to be an interactive
 *   element anymore once the hold has started.
 * - Locked (hands-free): a fixed toolbar — trash to discard, timer
 *   with pause/resume, stop button that moves to preview. No more
 *   drag gestures once locked; only these buttons end it.
 */
export function VoiceRecordingBar({
  locked,
  paused,
  elapsedMs,
  drag,
  cancelThresholdPx,
  lockThresholdPx,
  liveLevels,
  onCancel,
  onTogglePause,
  onStop,
}: VoiceRecordingBarProps) {
  if (locked) {
    return (
      <div className="px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={onCancel} className="text-danger flex-shrink-0 p-1" aria-label="Discard recording">
          <Trash2 size={20} />
        </button>
        <div className="flex-1 flex items-center gap-2 text-sm text-ink min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full bg-danger flex-shrink-0 ${paused ? "" : "animate-pulse"}`} />
          <span className="tabular-nums flex-shrink-0">{formatVoiceDuration(elapsedMs / 1000)}</span>
          <VoiceWaveform levels={liveLevels} filledColor="bg-accent" mutedColor="bg-ink-muted/25" heightClass="h-5" />
        </div>
        <button
          type="button"
          onClick={onTogglePause}
          className="text-ink flex-shrink-0 p-2"
          aria-label={paused ? "Resume recording" : "Pause recording"}
        >
          {paused ? <Play size={20} /> : <Pause size={20} />}
        </button>
        <button type="button" onClick={onStop} className="bg-accent text-white rounded-full p-2.5 flex-shrink-0" aria-label="Stop recording">
          <Square size={16} fill="currentColor" />
        </button>
      </div>
    );
  }

  // Still holding — fade the cancel hint out and slide the mic as the
  // finger drags left; rise + fill in the lock pill as it drags up.
  const cancelProgress = Math.min(1, Math.abs(drag.x) / cancelThresholdPx);
  const lockProgress = Math.min(1, drag.y / lockThresholdPx);

  return (
    <div className="relative px-4 py-3 flex items-center gap-3 overflow-hidden">
      <div
        className="absolute rounded-full p-2 bg-surface border border-border text-ink-muted transition-opacity"
        style={{
          right: 24,
          bottom: 44 + lockProgress * 8,
          opacity: 0.4 + lockProgress * 0.6,
          transform: `scale(${1 + lockProgress * 0.15})`,
        }}
      >
        <Lock size={16} className={lockProgress >= 1 ? "text-accent" : undefined} />
      </div>

      <span className="w-2.5 h-2.5 rounded-full bg-danger flex-shrink-0 animate-pulse" />
      <span className="tabular-nums text-sm text-ink flex-shrink-0">{formatVoiceDuration(elapsedMs / 1000)}</span>

      <div className="flex-1 min-w-0 flex justify-end">
        <div
          className="flex items-center gap-1 text-ink-muted text-sm transition-transform"
          style={{ transform: `translateX(${drag.x}px)`, opacity: 1 - cancelProgress * 0.8 }}
        >
          <ChevronsLeft size={16} />
          <span>Slide to cancel</span>
        </div>
      </div>

      <div className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center flex-shrink-0">
        <Mic size={18} />
      </div>
    </div>
  );
}
