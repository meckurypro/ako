// src/components/VoiceWaveform.tsx
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

interface VoiceWaveformProps {
  /** 0..1 amplitude values, rendered left-to-right. */
  levels: number[];
  /** 0..1 — bars up to this point render in `filledColor`. */
  progress?: number;
  filledColor: string; // Tailwind bg-* class
  mutedColor: string; // Tailwind bg-* class
  /** Present only on interactive (preview/sent) waveforms: click to jump, or press and DRAG to scrub
   *  (WhatsApp). Fires once, on release. */
  onSeek?: (ratio: number) => void;
  /** Live scrub position while the pointer is down (`null` when it lifts) — lets the caller show the scrub time. */
  onScrub?: (ratio: number | null) => void;
  heightClass?: string;
  /** WhatsApp's round scrub handle riding the bars at the current position (a bg-* class). */
  thumbColor?: string;
}

const THUMB = 14;

export function VoiceWaveform({
  levels,
  progress = 0,
  filledColor,
  mutedColor,
  onSeek,
  onScrub,
  heightClass = "h-7",
  thumbColor,
}: VoiceWaveformProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const shown = Math.min(1, Math.max(0, dragRatio ?? progress));

  function ratioAt(clientX: number) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }
  function down(e: ReactPointerEvent<HTMLDivElement>) {
    if (!onSeek) return;
    e.stopPropagation(); // don't start the bubble's own swipe/long-press from a scrub
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    const r = ratioAt(e.clientX);
    setDragRatio(r);
    onScrub?.(r);
  }
  function move(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const r = ratioAt(e.clientX);
    setDragRatio(r);
    onScrub?.(r);
  }
  function up(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    const r = ratioAt(e.clientX);
    setDragRatio(null);
    onScrub?.(null);
    onSeek?.(r);
  }
  function cancel() {
    if (!dragging.current) return;
    dragging.current = false;
    setDragRatio(null);
    onScrub?.(null);
  }

  return (
    <div
      className={`flex-1 min-w-0 ${onSeek ? "cursor-pointer py-2 -my-2 select-none" : ""}`}
      style={onSeek ? { touchAction: "pan-y" } : undefined}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
      role={onSeek ? "slider" : undefined}
      aria-label={onSeek ? "Seek voice note" : undefined}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? 100 : undefined}
      aria-valuenow={onSeek ? Math.round(shown * 100) : undefined}
    >
      <div ref={ref} className={`relative flex items-center gap-[2.5px] ${heightClass}`}>
        {levels.map((level, i) => {
          const isFilled = i / levels.length <= shown;
          return (
            <span
              key={i}
              className={`flex-1 rounded-full ${dragRatio === null ? "transition-colors duration-100" : ""} ${isFilled ? filledColor : mutedColor}`}
              style={{ height: `${Math.max(10, level * 100)}%` }}
            />
          );
        })}
        {thumbColor && (
          <span
            aria-hidden
            className={`pointer-events-none absolute top-1/2 rounded-full ${thumbColor}`}
            style={{
              width: THUMB,
              height: THUMB,
              marginTop: -THUMB / 2,
              left: `calc(${shown * 100}% - ${shown * THUMB}px)`,
              transform: dragRatio !== null ? "scale(1.25)" : undefined,
            }}
          />
        )}
      </div>
    </div>
  );
}
