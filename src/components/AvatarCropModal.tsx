// src/components/AvatarCropModal.tsx
//
// Square photo cropper for profile pictures — the web twin of the system crop sheet native shows
// (expo-image-picker with a 1:1 aspect). Drag to reposition, slider / wheel / pinch to zoom, round mask preview.
// Calls onConfirm with the cropped File; nothing is uploaded here.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { exportSquareCrop } from "../lib/cropImage";
import { Modal } from "./Modal";

const VIEW = 280; // crop viewport, CSS px
const MAX_ZOOM = 4;

interface Props {
  file: File;
  onCancel: () => void;
  onConfirm: (cropped: File) => void | Promise<void>;
}

export function AvatarCropModal({ file, onCancel, onConfirm }: Props) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 }); // image centre relative to viewport centre
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = nat ? Math.max(VIEW / nat.w, VIEW / nat.h) : 1; // "cover" scale at zoom 1
  const scale = base * zoom;

  const clamp = useCallback(
    (o: { x: number; y: number }, z: number) => {
      if (!nat) return o;
      const s = Math.max(VIEW / nat.w, VIEW / nat.h) * z;
      const mx = Math.max(0, (nat.w * s - VIEW) / 2);
      const my = Math.max(0, (nat.h * s - VIEW) / 2);
      return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
    },
    [nat]
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
      // Viewport top-left expressed in source-image pixels.
      const size = VIEW / scale;
      const x = nat.w / 2 + (-VIEW / 2 - off.x) / scale;
      const y = nat.h / 2 + (-VIEW / 2 - off.y) / scale;
      const cropped = await exportSquareCrop(img, {
        x: Math.max(0, Math.min(nat.w - size, x)),
        y: Math.max(0, Math.min(nat.h - size, y)),
        size: Math.min(size, nat.w, nat.h),
      });
      await onConfirm(cropped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't crop that image.");
      setBusy(false);
    }
  }

  return (
    <Modal onClose={busy ? () => {} : onCancel} title="Crop photo" themed>
      <div className="flex flex-col items-center gap-5">
        <div
          className="relative overflow-hidden rounded-2xl bg-black touch-none select-none cursor-grab active:cursor-grabbing"
          style={{ width: VIEW, height: VIEW }}
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
                    left: VIEW / 2 - (nat.w * scale) / 2 + off.x,
                    top: VIEW / 2 - (nat.h * scale) / 2 + off.y,
                  }
                : { visibility: "hidden" }
            }
          />
          {/* Round mask: what sits outside the circle is what avatars clip away. */}
          <div
            className="absolute inset-0 pointer-events-none rounded-full"
            style={{ boxShadow: "0 0 0 999px rgba(0,0,0,0.55)", border: "2px solid rgba(255,255,255,0.85)" }}
          />
        </div>

        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => changeZoom(Number(e.target.value))}
          aria-label="Zoom"
          className="w-full max-w-[280px]"
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
            Use photo
          </button>
        </div>
      </div>
    </Modal>
  );
}
