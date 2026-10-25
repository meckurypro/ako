// src/components/customPage/ColorPicker.tsx
// Photoshop-style colour picker: drag around the saturation/brightness box, slide the hue bar, or type a hex / RGB
// number. Everything stays in sync and the parent gets a valid #RRGGBB on every change, so the live preview updates
// while the person drags.
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type Hsv = { h: number; s: number; v: number }; // h 0–360, s/v 0–1

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function rgbToHsv(r: number, g: number, b: number): Hsv {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToRgb({ h, s, v }: Hsv): [number, number, number] {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** Accepts "3d5a45", "#3D5A45", "#abc" → "#3D5A45" / "#AABBCC"; anything else → null. */
export function normaliseHex(input: string): string | null {
  let t = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(t)) t = t.split("").map((c) => c + c).join("");
  return /^[0-9a-fA-F]{6}$/.test(t) ? "#" + t.toUpperCase() : null;
}

/** Pointer-driven 1D/2D drag surface. Reports 0–1 positions. The latest callback is read through a ref so a fast drag
 *  never acts on a stale closure, and touch-action:none (set by the caller) stops the page scrolling under the finger. */
function useDrag(onMove: (x: number, y: number) => void, onEnd: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useRef(false);
  const move = useRef(onMove);
  const end = useRef(onEnd);
  move.current = onMove;
  end.current = onEnd;
  const report = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    move.current(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1));
  };
  const stop = () => {
    if (!active.current) return;
    active.current = false;
    end.current();
  };
  return {
    ref,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        active.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        report(e);
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (active.current) report(e);
      },
      onPointerUp: stop,
      onPointerCancel: stop,
      onLostPointerCapture: stop,
      onContextMenu: (e: React.SyntheticEvent) => e.preventDefault(),
    },
  };
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  // The picker owns its colour while the person is interacting (HSV is the source of truth — hex → HSV loses the hue at
  // black/white/grey, which would make the hue slider jump back to red). The parent only receives updates at most once
  // per animation frame, so a drag doesn't re-render the whole editor and live preview on every pointer event.
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(...hexToRgb(value)));
  const hsvRef = useRef(hsv);
  const [hexText, setHexText] = useState(value.toUpperCase());
  const sent = useRef(value.toUpperCase()); // last value handed to the parent
  const pending = useRef<string | null>(null);
  const raf = useRef<number | null>(null);
  const dragging = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const flush = useCallback(() => {
    raf.current = null;
    if (pending.current && pending.current !== sent.current) {
      sent.current = pending.current;
      onChangeRef.current(pending.current);
    }
    pending.current = null;
  }, []);

  // Pick up changes that came from outside (e.g. a different colour was selected). Our own echoes are ignored, and
  // nothing is applied mid-drag, so the thumb can never be yanked back to an older value.
  useEffect(() => {
    const v = value.toUpperCase();
    if (dragging.current || v === sent.current || v === pending.current) return;
    sent.current = v;
    const next = rgbToHsv(...hexToRgb(v));
    const merged = next.s === 0 || next.v === 0 ? { ...next, h: hsvRef.current.h } : next;
    hsvRef.current = merged;
    setHsv(merged);
    setHexText(v);
  }, [value]);

  useEffect(
    () => () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      if (pending.current && pending.current !== sent.current) onChangeRef.current(pending.current);
    },
    [],
  );

  const emit = useCallback(
    (next: Hsv, immediate = false) => {
      hsvRef.current = next;
      setHsv(next);
      const hex = rgbToHex(...hsvToRgb(next));
      setHexText(hex);
      pending.current = hex;
      if (immediate) {
        if (raf.current !== null) cancelAnimationFrame(raf.current);
        flush();
      } else if (raf.current === null) {
        raf.current = requestAnimationFrame(flush);
      }
    },
    [flush],
  );

  const endDrag = useCallback(() => {
    dragging.current = false;
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    flush(); // make sure the final position is what the parent has
  }, [flush]);

  const box = useDrag((x, y) => {
    dragging.current = true;
    emit({ ...hsvRef.current, s: x, v: 1 - y });
  }, endDrag);
  const hue = useDrag((x) => {
    dragging.current = true;
    emit({ ...hsvRef.current, h: x * 359.999 });
  }, endDrag);

  const [r, g, b] = hsvToRgb(hsv).map(Math.round);
  const hex = rgbToHex(r, g, b);
  const pure = `hsl(${hsv.h}, 100%, 50%)`;

  function commitHex(text: string) {
    const h = normaliseHex(text);
    if (!h) {
      setHexText(hex); // invalid → snap back to what's showing
      return;
    }
    const next = rgbToHsv(...hexToRgb(h));
    // Keep the current hue when the typed colour has none (greys), so the slider doesn't snap to red.
    emit(next.s === 0 || next.v === 0 ? { ...next, h: hsvRef.current.h } : next, true);
  }

  function setChannel(i: 0 | 1 | 2, raw: string) {
    const n = clamp(parseInt(raw.replace(/\D/g, "") || "0", 10), 0, 255);
    const rgb: [number, number, number] = [r, g, b];
    rgb[i] = n;
    const next = rgbToHsv(...rgb);
    emit(next.s === 0 || next.v === 0 ? { ...next, h: hsvRef.current.h } : next, true);
  }

  return (
    <div className="rounded-2xl bg-surface border border-border p-3 select-none">
      {/* Saturation (→) and brightness (↑) */}
      <div
        ref={box.ref}
        {...box.handlers}
        role="slider"
        aria-label="Colour shade"
        aria-valuetext={hex}
        className="relative w-full h-44 rounded-xl cursor-crosshair touch-none select-none overflow-hidden"
        style={{ WebkitTouchCallout: "none", backgroundColor: pure, backgroundImage: "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)" }}
      >
        <span
          className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-white pointer-events-none"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex, boxShadow: "0 0 0 1px rgba(0,0,0,.45), 0 2px 6px rgba(0,0,0,.35)" }}
        />
      </div>

      {/* Hue */}
      <div
        ref={hue.ref}
        {...hue.handlers}
        role="slider"
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        className="relative w-full h-4 mt-3 rounded-full cursor-pointer touch-none select-none"
        style={{ background: "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)" }}
      >
        <span
          className="absolute top-1/2 w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-white pointer-events-none"
          style={{ left: `${(hsv.h / 360) * 100}%`, background: pure, boxShadow: "0 0 0 1px rgba(0,0,0,.45), 0 2px 6px rgba(0,0,0,.35)" }}
        />
      </div>

      {/* Number inputs */}
      <div className="flex items-end gap-2 mt-3">
        <div className="w-11 h-11 rounded-xl border border-border shrink-0" style={{ background: hex }} aria-hidden />
        <label className="flex-1 min-w-0">
          <span className="block text-[10px] uppercase tracking-wide text-ink-muted mb-1">Hex</span>
          <input
            value={hexText}
            onChange={(e) => {
              setHexText(e.target.value);
              // Apply live only on a full 6-digit value, so typing "#3D5" isn't expanded under the person's fingers.
              if (/^#?[0-9a-fA-F]{6}$/.test(e.target.value.trim())) commitHex(e.target.value);
            }}
            onBlur={(e) => commitHex(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            spellCheck={false}
            autoCapitalize="characters"
            maxLength={7}
            inputMode="text"
            className="w-full rounded-lg bg-canvas border border-border text-ink px-2.5 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>
        {(["R", "G", "B"] as const).map((label, i) => (
          <label key={label} className="w-12 shrink-0">
            <span className="block text-[10px] uppercase tracking-wide text-ink-muted mb-1">{label}</span>
            <input
              value={[r, g, b][i]}
              onChange={(e) => setChannel(i as 0 | 1 | 2, e.target.value)}
              inputMode="numeric"
              maxLength={3}
              className="w-full rounded-lg bg-canvas border border-border text-ink px-1.5 py-2 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

/** Three brand-colour swatches; tapping one opens the picker beneath. */
export function BrandColorFields({
  colors,
  onChange,
}: {
  colors: { primary: string; secondary: string; accent: string };
  onChange: (key: "primary" | "secondary" | "accent", hex: string) => void;
}) {
  const [open, setOpen] = useState<"primary" | "secondary" | "accent" | null>("primary");
  const keys = ["primary", "secondary", "accent"] as const;
  return (
    <div className="mb-6">
      <div className="grid grid-cols-3 gap-3">
        {keys.map((k) => {
          const active = open === k;
          return (
            <button
              key={k}
              type="button"
              aria-expanded={active}
              onClick={() => setOpen(active ? null : k)}
              className={`flex flex-col items-center gap-2 rounded-xl bg-surface border p-3 ${active ? "border-accent ring-2 ring-accent/30" : "border-border"}`}
            >
              <span className="w-12 h-12 rounded-lg border border-border flex items-center justify-center" style={{ background: colors[k] }}>
                {active && <ChevronDown size={16} className="text-white mix-blend-difference" />}
              </span>
              <span className="text-xs font-medium text-ink capitalize">{k}</span>
              <span className="text-[11px] text-ink-muted uppercase font-mono">{colors[k]}</span>
            </button>
          );
        })}
      </div>
      {open && (
        <div className="mt-3">
          <ColorPicker key={open} value={colors[open]} onChange={(hex) => onChange(open, hex)} />
          <button type="button" onClick={() => setOpen(null)} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent-soft text-accent text-sm font-medium px-4 py-2">
            <Check size={14} /> Done
          </button>
        </div>
      )}
    </div>
  );
}
