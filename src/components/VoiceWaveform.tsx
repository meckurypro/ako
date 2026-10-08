// src/components/VoiceWaveform.tsx
import type { MouseEvent } from "react";

interface VoiceWaveformProps {
  /** 0..1 amplitude values, rendered left-to-right. */
  levels: number[];
  /** 0..1 — bars up to this point render in `filledColor`. */
  progress?: number;
  filledColor: string; // Tailwind bg-* class
  mutedColor: string; // Tailwind bg-* class
  /** Present only on interactive (preview/sent) waveforms — tapping
   *  anywhere on the bars seeks playback to that ratio, same as
   *  WhatsApp's tap-to-scrub. */
  onSeek?: (ratio: number) => void;
  heightClass?: string;
  /** WhatsApp's round scrub handle riding the bars at the current position (a bg-* class). */
  thumbColor?: string;
}

export function VoiceWaveform({
  levels,
  progress = 0,
  filledColor,
  mutedColor,
  onSeek,
  heightClass = "h-7",
  thumbColor,
}: VoiceWaveformProps) {
  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(ratio);
  }

  return (
    <div
      className={`relative flex items-center gap-[2.5px] flex-1 min-w-0 ${heightClass} ${onSeek ? "cursor-pointer" : ""}`}
      onClick={handleClick}
    >
      {levels.map((level, i) => {
        const isFilled = i / levels.length <= progress;
        return (
          <span
            key={i}
            className={`flex-1 rounded-full transition-colors duration-100 ${isFilled ? filledColor : mutedColor}`}
            style={{ height: `${Math.max(10, level * 100)}%` }}
          />
        );
      })}
      {thumbColor && (
        <span
          aria-hidden
          className={`pointer-events-none absolute top-1/2 w-3 h-3 -mt-1.5 rounded-full ${thumbColor}`}
          style={{ left: `calc(${Math.min(1, Math.max(0, progress)) * 100}% - ${Math.min(1, Math.max(0, progress)) * 12}px)` }}
        />
      )}
    </div>
  );
}
