// src/components/ThumbnailCropModal.tsx
//
// The crop sheet every project thumbnail goes through when the picture isn't already the required shape.
// The frame is locked to the shape the project's type needs (lib/thumbnailSpec.ts): drag to reposition, slider /
// wheel / pinch to zoom, and what's inside the frame is exactly what is saved and shown everywhere.
// Calls onConfirm with the cropped File; nothing is uploaded here.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { exportSpecCrop } from "../lib/cropImage";
import type { ThumbSpec } from "../lib/thumbnailSpec";
import { Modal } from "./Modal";

const MAX_W = 300; // crop frame bounds, CSS px
const MAX_H = 340;
const MAX_ZOOM = 4;

interface Props {
  file: File;
  spec: ThumbSpec;
  /** Sheet title, e.g. "Crop video thumbnail". */
  title?: string;
  /** Short reason shown under the frame, e.g. "Videos use a widescreen 16:9 thumbnail." */
  note?: string;
  onCancel: () => void;
  onConfirm: (cropped: File) => void | Promise<void>;
}

export function ThumbnailCropModal({ file, spec, title = "Crop thumbnail", note, onCancel, onConfirm }: Props) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  // The largest frame of the required shape that fits the bounds.
  const { vw, vh } = useMemo(() => {
    let w = MAX_W;
    let h = w / spec.ratio;
    if (h > MAX_H) {
      h = MAX_H;
      w = h * spec.ratio;
    }
    return { vw: Math.round(w), vh: Math.round(h) };
  }, [spec.ratio]);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 }); // image centre relative to frame centre
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseScale = useCallback((n: { w: number; h: number }) => Math.max(vw / n.w, vh / n.h), [vw, vh]); // "cover" at zoom 1
  const scale = nat ? baseScale(nat) * zoom : 1;

  const clamp = useCallback(
    (o: { x: number; y: number }, z: number) => {
      if (!nat) return o;
      const s = baseScale(nat) * z;
      const mx = Math.max(0, (nat.w * s - vw) / 2);
      const my = Math.max(0, (nat.h * s - vh) / 2);
      return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
    },
    [nat, baseScale, vw, vh]
  );

  function changeZoom(z: number) {
    const next = Math.min(MAX_ZOOM, Math.max(1, z));
    setZoom(next);
    setOff((o) => clamp(o, next));
  }

  // Pointer drag (mouse + touch) and two-finger pinch.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; zoom: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      changeZoom(gesture.current.zoom * (d / gesture.current.dist));
      return;
    }
    if (pointers.current.size === 1) {
      setOff((o) => clamp({ x: o.x + cur.x - prev.x, y: o.y + cur.y - prev.y }, zoom));
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
  }

  async function handleConfirm() {
    const img = imgRef.current;
    if (!img || !nat) return;
    setBusy(true);
    setError(null);
    try {
      // The frame's top-left, expressed in source-image pixels.
      const w = vw / scale;
      const h = vh / scale;
      const x = nat.w / 2 + (-vw / 2 - off.x) / scale;
      const y = nat.h / 2 + (-vh / 2 - off.y) / scale;
      const cropped = await exportSpecCrop(
        img,
        {
          x: Math.max(0, Math.min(nat.w - w, x)),
          y: Math.max(0, Math.min(nat.h - h, y)),
          width: Math.min(w, nat.w),
          height: Math.min(h, nat.h),
        },
        spec
      );
      await onConfirm(cropped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't crop that image.");
      setBusy(false);
    }
  }

  return (
    <Modal onClose={busy ? () => {} : onCancel} title={title} themed>
      <div className="flex flex-col items-center gap-4">
        <div
          className="relative overflow-hidden rounded-2xl bg-black touch-none select-none cursor-grab active:cursor-grabbing"
          style={{ width: vw, height: vh }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={(e) => changeZoom(zoom - e.deltaY * 0.002)}
        >
          <img
            ref={imgRef}
            src={url}
            alt=""
            draggable={false}
            onLoad={(e) => {
              const i = e.currentTarget;
              setNat({ w: i.naturalWidth, h: i.naturalHeight });
            }}
            className="absolute max-w-none pointer-events-none"
            style={
              nat
                ? {
                    width: nat.w * scale,
                    height: nat.h * scale,
                    left: vw / 2 - (nat.w * scale) / 2 + off.x,
                    top: vh / 2 - (nat.h * scale) / 2 + off.y,
                  }
                : { visibility: "hidden" }
            }
          />
          {/* Thin frame so the edge of the saved thumbnail is obvious. */}
          <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ border: "2px solid rgba(255,255,255,0.85)" }} />
        </div>

        <p className="text-xs text-overlay-ink-muted text-center max-w-[300px]">
          {spec.label}. {note ?? "Drag to reposition, pinch or use the slider to zoom."}
        </p>

        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => changeZoom(Number(e.target.value))}
          aria-label="Zoom"
          className="w-full max-w-[300px]"
          disabled={busy}
        />

        {error ? <p className="text-sm text-danger text-center">{error}</p> : null}

        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-3 rounded-full bg-overlay-surface-raised text-sm font-medium text-overlay-ink disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !nat}
            className="flex-1 py-3 rounded-full bg-overlay-accent text-sm font-medium text-overlay-surface disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            Use thumbnail
          </button>
        </div>
      </div>
    </Modal>
  );
}
