// src/components/DownloadControl.tsx
// Download affordances shared by photo tiles and document cards (WhatsApp-style):
//   • DownloadPill — "↓ 1.2 MB" before you've clicked
//   • ProgressRing — live ring with a ✕ to cancel while it downloads (spins when the total is unknown)
import { ArrowDown, RotateCw, X } from "lucide-react";
import type { MouseEvent } from "react";

export function DownloadPill({ label, failed, onClick }: { label: string; failed?: boolean; onClick: (e: MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={failed ? "Download failed. Click to retry" : `Download${label ? ` ${label}` : ""}`}
      className="flex items-center gap-1.5 rounded-full bg-black/50 hover:bg-black/60 px-3.5 py-2 text-white text-[13px] font-medium backdrop-blur-sm"
    >
      {failed ? <RotateCw size={18} /> : <ArrowDown size={18} />}
      {failed ? "Retry" : label || "Download"}
    </button>
  );
}

export function ProgressRing({
  progress,
  size = 52,
  onCancel,
  dark = true,
}: {
  /** 0..1, or a negative number for "unknown" (indeterminate spinner). */
  progress: number;
  size?: number;
  onCancel: (e: MouseEvent) => void;
  /** White-on-dark (over a photo) vs ink-on-light (in a document card). */
  dark?: boolean;
}) {
  const stroke = Math.max(2.5, size / 16);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const indeterminate = progress < 0;
  const shown = indeterminate ? 0.28 : Math.max(0.04, Math.min(1, progress));
  return (
    <button
      type="button"
      onClick={onCancel}
      aria-label="Cancel download"
      className={`relative flex items-center justify-center rounded-full ${dark ? "bg-black/50 text-white" : "bg-ink-muted/15 text-ink-muted"}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className={`absolute inset-0 ${indeterminate ? "animate-spin" : "-rotate-90"}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - shown)}
          style={{ transition: "stroke-dashoffset 150ms linear" }}
        />
      </svg>
      <X size={Math.round(size * 0.38)} />
    </button>
  );
}
