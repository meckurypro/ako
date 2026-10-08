// src/components/VoiceRecordingBar.tsx
// Shown over the composer while recording, WhatsApp-style.
//   Holding: pulsing dot + timer · "‹ Slide to cancel" (breathes, follows your finger) · the mic
//            swells and follows your finger · a lock capsule above it fills as you slide up.
//   Locked:  trash · live waveform + timer · pause/resume · send.
//            (Without `onSend` — rooms — it keeps the original pause/stop layout.)
import { Trash2, Pause, Play, Square, Lock, ChevronLeft, ChevronUp, Mic, Send } from "lucide-react";
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
  /** When given, the locked bar shows a send button (record → send in one tap, like WhatsApp). */
  onSend?: () => void;
  /** When given and paused, shows a play button that opens the draft preview. */
  onPreview?: () => void;
}

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
  onSend,
  onPreview,
}: VoiceRecordingBarProps) {
  if (locked && onSend) {
    return (
      <div className="px-3 py-3 flex items-center gap-2">
        <button type="button" onClick={onCancel} className="w-10 h-10 rounded-full text-ink-muted flex items-center justify-center flex-shrink-0" aria-label="Delete recording">
          <Trash2 size={22} />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2.5 rounded-3xl border border-border bg-surface px-3 py-2">
          <span className={`w-2.5 h-2.5 rounded-full bg-danger flex-shrink-0 ${paused ? "" : "animate-pulse"}`} />
          <span className="tabular-nums text-sm text-ink flex-shrink-0">{formatVoiceDuration(elapsedMs / 1000)}</span>
          <VoiceWaveform levels={liveLevels} filledColor="bg-accent" mutedColor="bg-ink-muted/25" heightClass="h-5" />
        </div>
        {paused && onPreview && (
          <button type="button" onClick={onPreview} className="w-10 h-10 rounded-full bg-surface text-ink flex items-center justify-center flex-shrink-0" aria-label="Play back recording">
            <Play size={18} fill="currentColor" />
          </button>
        )}
        <button
          type="button"
          onClick={onTogglePause}
          className="w-10 h-10 rounded-full border-2 border-danger text-danger flex items-center justify-center flex-shrink-0"
          aria-label={paused ? "Resume recording" : "Pause recording"}
        >
          {paused ? <Mic size={18} /> : <Pause size={18} />}
        </button>
        <button
          type="button"
          onClick={onSend}
          className="w-11 h-11 rounded-full bg-accent text-white flex items-center justify-center flex-shrink-0 hover:bg-accent-hover active:scale-95"
          aria-label="Send voice message"
        >
          <Send size={20} />
        </button>
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
    <div className="relative px-4 py-3 flex items-center gap-3">
      {/* Lock capsule — fills and tints as the finger slides up toward it. */}
      <div
        className={`pointer-events-none absolute flex flex-col items-center gap-1 rounded-full border px-2.5 py-2.5 transition-colors ${
          lockProgress >= 1 ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-ink-muted"
        }`}
        style={{ right: 17, bottom: 58, opacity: 0.55 + lockProgress * 0.45, transform: `translateY(${-lockProgress * 10}px) scale(${1 + lockProgress * 0.1})` }}
      >
        <Lock size={16} />
        <ChevronUp size={14} className="text-ink-muted" />
      </div>

      <span className="w-2.5 h-2.5 rounded-full bg-danger flex-shrink-0 animate-pulse" />
      <span className="tabular-nums text-sm text-ink flex-shrink-0">{formatVoiceDuration(elapsedMs / 1000)}</span>

      <div className="flex-1 min-w-0 flex justify-end pr-12">
        <div
          className={`flex items-center gap-0.5 text-sm animate-pulse ${willCancel ? "text-danger" : "text-ink-muted"}`}
          style={{ transform: `translateX(${dx}px)`, opacity: 1 - cancelProgress * 0.85 }}
        >
          <ChevronLeft size={16} />
          <span>Slide to cancel</span>
        </div>
      </div>

      {/* The mic swells under the finger and follows it, like WhatsApp's. */}
      <div
        className={`pointer-events-none absolute w-11 h-11 rounded-full text-white flex items-center justify-center shadow-md ${willCancel ? "bg-danger" : "bg-accent"}`}
        style={{ right: 12, transform: `translate(${dx}px, ${-dy}px) scale(1.3)` }}
      >
        <Mic size={20} />
      </div>
    </div>
  );
}
