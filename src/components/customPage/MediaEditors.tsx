// src/components/customPage/MediaEditors.tsx
// Editor controls for the three "page dressing" features: background picture, foreground picture, page menu.
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  BACKGROUND_BY_TEMPLATE,
  BACKGROUND_FITS,
  BACKGROUND_LOOKS,
  FOREGROUND_DEFAULTS,
  FOREGROUND_LIMITS,
  LIMITS,
  LOOK_CSS,
  NAV_TARGETS,
  SCROLL_ANIMATIONS,
  availableNavTargets,
  newNavId,
  publicFileUrl,
  resolveBackground,
  resolveDesign,
  resolveForeground,
  resolveNav,
  type BackgroundFit,
  type BackgroundLook,
  type CustomPageBackground,
  type CustomPageConfig,
  type CustomPageForeground,
  type CustomPageNav,
  type CustomPageNavItem,
  type NavTarget,
} from "../../lib/customPage";
import { SHAPES } from "../../lib/customPageShapes";
import { ForegroundArt } from "./CustomPageRenderer";
import { Field, INPUT, SingleImage } from "./EditorParts";

const chip = (on: boolean) => `rounded-full px-4 py-2 text-sm font-medium ${on ? "bg-ink text-canvas" : "bg-surface border border-border text-ink-muted"}`;

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  onReset,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  onReset?: () => void;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span className="flex items-center gap-2 text-xs text-ink-muted tabular-nums">
          {Math.round(value * 10) / 10}
          {unit}
          {onReset && (
            <button type="button" aria-label={`Reset ${label}`} onClick={onReset} className="p-1 text-ink-muted">
              <RotateCcw size={13} />
            </button>
          )}
        </span>
      </div>
      <input
        type="range"
        className="w-full accent-[var(--color-accent)]"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl bg-surface border border-border p-4 cursor-pointer mb-4">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-ink-muted mt-0.5 leading-snug">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" className="w-5 h-5 shrink-0 accent-[var(--color-accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

// ── Background ──────────────────────────────────────────────────────────────────────────────────────────────
export function BackgroundEditor({
  config,
  ownerId,
  pageId,
  onChange,
}: {
  config: CustomPageConfig;
  ownerId: string;
  pageId: string;
  onChange: (bg: CustomPageBackground | undefined) => void;
}) {
  const bg = config.brand?.background;
  const resolved = resolveBackground(config);
  const url = publicFileUrl(bg?.path);
  const template = resolveDesign(config).template;
  const auto = BACKGROUND_BY_TEMPLATE[template];
  const patch = (p: Partial<CustomPageBackground>) => onChange({ ...bg, ...p });
  return (
    <>
      <SingleImage
        label="Background picture"
        hint="Sits behind your whole page. Pick something with room for text, or let the look below soften it."
        path={bg?.path}
        ownerId={ownerId}
        pageId={pageId}
        onChange={(path) => (path ? patch({ path }) : onChange(undefined))}
      />
      {url && resolved && (
        <>
          <div
            className="mb-5 h-28 rounded-2xl overflow-hidden border border-border bg-surface"
            style={{
              backgroundImage: `url("${url}")`,
              backgroundSize: resolved.fit === "stretch" ? "100% 100%" : resolved.fit === "tile" ? "auto" : "cover",
              backgroundRepeat: resolved.fit === "tile" ? "repeat" : "no-repeat",
              backgroundPosition: "center",
              filter: LOOK_CSS[resolved.look].filter,
            }}
            role="img"
            aria-label="Background preview"
          />
          <Field label="Fit" hint={`Automatic uses “${auto.fit === "cover" ? "Fill" : auto.fit}” for your ${template} layout.`}>
            <div className="flex flex-wrap gap-2">
              {BACKGROUND_FITS.map((f) => (
                <button key={f.id} type="button" onClick={() => patch({ fit: f.id as BackgroundFit })} className={chip((bg?.fit ?? "auto") === f.id)} title={f.blurb}>
                  {f.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-muted mt-2 leading-snug">{BACKGROUND_FITS.find((f) => f.id === (bg?.fit ?? "auto"))?.blurb}</p>
          </Field>
          <Field label="Look" hint="How the picture is treated so your text stays easy to read.">
            <div className="flex flex-wrap gap-2">
              {BACKGROUND_LOOKS.map((l) => (
                <button key={l.id} type="button" onClick={() => patch({ look: l.id as BackgroundLook })} className={chip((bg?.look ?? "auto") === l.id)} title={l.blurb}>
                  {l.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-muted mt-2 leading-snug">{BACKGROUND_LOOKS.find((l) => l.id === (bg?.look ?? "auto"))?.blurb}</p>
          </Field>
        </>
      )}
    </>
  );
}

// ── Foreground ──────────────────────────────────────────────────────────────────────────────────────────────
function ShapeTile({ id, label, path, aspect, active, onClick }: { id: string; label: string; path?: string; aspect?: number; active: boolean; onClick: () => void }) {
  const box = 34;
  const w = aspect && aspect < 1 ? box * aspect : box;
  const h = aspect && aspect > 1 ? box / aspect : box;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      data-shape={id}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2 ${active ? "bg-accent-soft border-accent" : "bg-surface border-border"}`}
    >
      <span className="flex items-center justify-center" style={{ width: box, height: box }}>
        {path ? (
          <svg width={w} height={h} viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
            <path d={path} fill="currentColor" className={active ? "text-accent" : "text-ink-muted"} />
          </svg>
        ) : (
          <svg width={box} height={box} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={active ? "text-accent" : "text-ink-muted"} aria-hidden="true">
            <rect x="4" y="5" width="16" height="14" rx="1" />
            <path d="M4 15l4-4 4 4 3-3 5 5" />
          </svg>
        )}
      </span>
      <span className="text-[10.5px] leading-none text-ink-muted">{label}</span>
    </button>
  );
}

/** A little compass: drag (or tap) anywhere on it to set the direction the shadow falls. */
function AngleDial({ angle, onChange }: { angle: number; onChange: (a: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const set = (e: ReactPointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const deg = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    onChange(Math.round((deg + 360) % 360));
  };
  const rad = (angle * Math.PI) / 180;
  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Shadow direction"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={angle}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        set(e);
      }}
      onPointerMove={(e) => e.buttons === 1 && set(e)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange((angle + 5) % 360);
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange((angle + 355) % 360);
      }}
      className="relative w-24 h-24 rounded-full bg-surface border border-border touch-none shrink-0 cursor-pointer"
    >
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-9 h-9 rounded-lg bg-ink/15" style={{ boxShadow: `${Math.cos(rad) * 5}px ${Math.sin(rad) * 5}px 6px rgba(0,0,0,.35)` }} />
      </span>
      <span className="absolute w-3 h-3 rounded-full bg-accent" style={{ left: `calc(50% + ${Math.cos(rad) * 38}px - 6px)`, top: `calc(50% + ${Math.sin(rad) * 38}px - 6px)` }} />
    </div>
  );
}

export function ForegroundEditor({
  config,
  ownerId,
  pageId,
  onChange,
}: {
  config: CustomPageConfig;
  ownerId: string;
  pageId: string;
  onChange: (fg: CustomPageForeground | undefined) => void;
}) {
  const fg = config.foreground;
  const resolved = resolveForeground(config);
  const url = publicFileUrl(fg?.path);
  const patch = (p: Partial<CustomPageForeground>) => onChange({ ...fg, ...p });
  const patchCrop = (p: Partial<NonNullable<CustomPageForeground["crop"]>>) => patch({ crop: { ...fg?.crop, ...p } });
  const patchShadow = (p: Partial<NonNullable<CustomPageForeground["shadow"]>>) => patch({ shadow: { ...fg?.shadow, ...p } });

  const stage = useRef<HTMLDivElement>(null);
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  const moveTo = (e: ReactPointerEvent) => {
    const r = stage.current?.getBoundingClientRect();
    if (!r || !grab.current || !resolved) return;
    const x = ((e.clientX - r.left) / r.width) * 100 - grab.current.dx;
    const y = ((e.clientY - r.top) / r.height) * 100 - grab.current.dy;
    patch({ x: Math.round(Math.min(100, Math.max(0, x)) * 10) / 10, y: Math.round(Math.min(100, Math.max(0, y)) * 10) / 10 });
  };

  const pad = useRef<HTMLDivElement>(null);
  const panFrom = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  return (
    <>
      <SingleImage
        label="Foreground picture"
        hint="A picture that sits on top of your page. Use a PNG with a transparent background to place a cut-out."
        path={fg?.path}
        ownerId={ownerId}
        pageId={pageId}
        onChange={(path) => (path ? patch({ path }) : onChange(undefined))}
      />

      {url && resolved && (
        <>
          <Field label="Shape" hint="The picture is clipped to this shape. Choose “None” to show it as it is.">
            <div className="grid grid-cols-4 gap-2">
              <ShapeTile id="none" label="None" active={!resolved.shape} onClick={() => patch({ shape: "none" })} />
              {SHAPES.map((s) => (
                <ShapeTile key={s.id} id={s.id} label={s.label} path={s.path} aspect={s.aspect} active={resolved.shape?.id === s.id} onClick={() => patch({ shape: s.id })} />
              ))}
            </div>
          </Field>

          <Field label="Position" hint="Drag the picture to place it. This is the first screen of your page.">
            <div
              ref={stage}
              className="relative mx-auto w-full max-w-[240px] aspect-[4/5] rounded-2xl bg-ink/5 border border-border overflow-hidden touch-none cursor-grab select-none"
              onPointerDown={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                const px = ((e.clientX - r.left) / r.width) * 100;
                const py = ((e.clientY - r.top) / r.height) * 100;
                // Grab where you touched, so the picture doesn't jump to the finger.
                const near = Math.abs(px - resolved.x) < resolved.size / 2 + 6 && Math.abs(py - resolved.y) < resolved.size / 2 + 6;
                grab.current = near ? { dx: px - resolved.x, dy: py - resolved.y } : { dx: 0, dy: 0 };
                e.currentTarget.setPointerCapture(e.pointerId);
                moveTo(e);
              }}
              onPointerMove={(e) => e.buttons === 1 && moveTo(e)}
              onPointerUp={() => (grab.current = null)}
              onPointerCancel={() => (grab.current = null)}
            >
              <ForegroundArt fg={resolved} url={url} />
              <span className="absolute inset-0 pointer-events-none border border-dashed border-ink/10 rounded-2xl" />
            </div>
            <div className="flex justify-center mt-2">
              <button type="button" className="text-xs text-ink-muted inline-flex items-center gap-1" onClick={() => patch({ x: FOREGROUND_DEFAULTS.x, y: FOREGROUND_DEFAULTS.y })}>
                <RotateCcw size={12} /> Centre it
              </button>
            </div>
          </Field>

          <Slider label="Size" value={resolved.size} min={FOREGROUND_LIMITS.size[0]} max={FOREGROUND_LIMITS.size[1]} unit="%" onChange={(size) => patch({ size })} onReset={() => patch({ size: FOREGROUND_DEFAULTS.size })} />
          <Slider label="Rotation" value={resolved.rotation} min={FOREGROUND_LIMITS.rotation[0]} max={FOREGROUND_LIMITS.rotation[1]} unit="°" onChange={(rotation) => patch({ rotation })} onReset={() => patch({ rotation: 0 })} />

          {resolved.shape && (
            <Field label="Crop" hint="Drag inside the shape to choose which part of the picture shows. Zoom in to crop closer.">
              <div className="flex items-start gap-4">
                <div
                  ref={pad}
                  className="relative shrink-0 touch-none cursor-grab select-none rounded-xl bg-ink/5 border border-border"
                  style={{ width: 132, height: 132 }}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    panFrom.current = { x: e.clientX, y: e.clientY, cx: resolved.crop.x, cy: resolved.crop.y };
                  }}
                  onPointerMove={(e) => {
                    const from = panFrom.current;
                    const r = pad.current?.getBoundingClientRect();
                    if (!from || !r || e.buttons !== 1) return;
                    // Dragging the picture right reveals more of its left, so the focal point moves the other way.
                    const k = 100 / Math.max(1, resolved.crop.zoom);
                    const nx = Math.min(100, Math.max(0, from.cx - ((e.clientX - from.x) / r.width) * k));
                    const ny = Math.min(100, Math.max(0, from.cy - ((e.clientY - from.y) / r.height) * k));
                    patchCrop({ x: Math.round(nx), y: Math.round(ny) });
                  }}
                  onPointerUp={() => (panFrom.current = null)}
                  onPointerCancel={() => (panFrom.current = null)}
                >
                  <ForegroundArt fg={{ ...resolved, x: 50, y: 50, size: 84, rotation: 0, shadow: { ...resolved.shadow, enabled: false } }} url={url} />
                </div>
                <div className="flex-1 min-w-0">
                  <Slider label="Zoom" value={resolved.crop.zoom} min={FOREGROUND_LIMITS.zoom[0]} max={FOREGROUND_LIMITS.zoom[1]} step={0.05} unit="×" onChange={(zoom) => patchCrop({ zoom })} onReset={() => patchCrop({ zoom: 1, x: 50, y: 50 })} />
                  <Slider label="Left / right" value={resolved.crop.x} min={0} max={100} unit="%" onChange={(x) => patchCrop({ x })} />
                  <Slider label="Up / down" value={resolved.crop.y} min={0} max={100} unit="%" onChange={(y) => patchCrop({ y })} />
                </div>
              </div>
            </Field>
          )}

          <Toggle label="Drop shadow" hint="Lifts the picture off the page." checked={resolved.shadow.enabled} onChange={(enabled) => patchShadow({ enabled })} />
          {resolved.shadow.enabled && (
            <div className="flex items-center gap-4 -mt-1 mb-4">
              <AngleDial angle={resolved.shadow.angle} onChange={(angle) => patchShadow({ angle })} />
              <div className="flex-1 min-w-0">
                <Slider label="Intensity" value={resolved.shadow.intensity} min={FOREGROUND_LIMITS.intensity[0]} max={FOREGROUND_LIMITS.intensity[1]} unit="%" onChange={(intensity) => patchShadow({ intensity })} />
                <Slider label="Direction" value={resolved.shadow.angle} min={0} max={360} unit="°" onChange={(angle) => patchShadow({ angle })} />
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ── Menu ────────────────────────────────────────────────────────────────────────────────────────────────────
const DEFAULT_LABEL: Record<NavTarget, string> = { top: "Home", about: "About", buttons: "Links", document: "Document", gallery: "Gallery", contact: "Contact" };

export function MenuEditor({ config, onChange }: { config: CustomPageConfig; onChange: (nav: CustomPageNav) => void }) {
  const nav = config.nav ?? {};
  const resolved = resolveNav(config);
  const items = nav.items ?? [];
  const available = availableNavTargets(config);
  const patch = (p: Partial<CustomPageNav>) => onChange({ ...nav, ...p });
  const setItems = (next: CustomPageNavItem[]) => patch({ items: next });
  const patchItem = (i: number, p: Partial<CustomPageNavItem>) => setItems(items.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };
  const addAll = () => {
    const have = new Set(items.map((i) => i.target));
    const added: CustomPageNavItem[] = [];
    for (const t of available) {
      if (have.has(t) || items.length + added.length >= LIMITS.navItems) continue;
      added.push({ id: newNavId([...items, ...added]), label: DEFAULT_LABEL[t], target: t });
    }
    if (added.length) patch({ items: [...items, ...added], enabled: true });
  };

  return (
    <>
      <Toggle label="Show a menu" hint="A bar on your page. Each item scrolls the visitor to a section." checked={nav.enabled === true} onChange={(enabled) => patch({ enabled })} />
      {nav.enabled === true && (
        <>
          <Field label="Menu items" count={items.length} max={LIMITS.navItems}>
            <div className="flex flex-col gap-3">
              {items.map((item, i) => {
                const missing = !available.includes(item.target);
                return (
                  <div key={item.id} className="rounded-2xl bg-surface border border-border p-3">
                    <div className="flex items-center gap-2">
                      <input
                        className={`${INPUT} !py-2`}
                        aria-label={`Menu item ${i + 1} label`}
                        value={item.label}
                        maxLength={LIMITS.navLabel + 6}
                        placeholder="Label"
                        onChange={(e) => patchItem(i, { label: e.target.value })}
                      />
                      <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="p-1.5 text-ink-muted disabled:opacity-30">
                        <ArrowUp size={16} />
                      </button>
                      <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="p-1.5 text-ink-muted disabled:opacity-30">
                        <ArrowDown size={16} />
                      </button>
                      <button type="button" aria-label="Remove item" onClick={() => setItems(items.filter((_, k) => k !== i))} className="p-1.5 text-danger">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <select className={`${INPUT} mt-2 !py-2`} aria-label={`Menu item ${i + 1} goes to`} value={item.target} onChange={(e) => patchItem(i, { target: e.target.value as NavTarget })}>
                      {NAV_TARGETS.map((t) => (
                        <option key={t.id} value={t.id}>
                          Goes to: {t.label}
                          {available.includes(t.id) ? "" : " (nothing there yet)"}
                        </option>
                      ))}
                    </select>
                    {missing && <p className="text-xs text-danger mt-1.5">Your page has no {NAV_TARGETS.find((t) => t.id === item.target)?.label.toLowerCase()} yet, so this item stays hidden.</p>}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {items.length < LIMITS.navItems && (
                <button
                  type="button"
                  onClick={() => {
                    const used = new Set(items.map((i) => i.target));
                    const t = available.find((x) => !used.has(x)) ?? "top";
                    setItems([...items, { id: newNavId(items), label: DEFAULT_LABEL[t], target: t }]);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-accent-soft text-accent text-sm font-medium px-4 py-2.5"
                >
                  <Plus size={16} /> Add an item
                </button>
              )}
              <button type="button" onClick={addAll} className="rounded-full bg-surface border border-border text-ink-muted text-sm font-medium px-4 py-2.5">
                Add every section
              </button>
            </div>
          </Field>

          <Field label="Scroll animation" hint="How the page moves when someone taps an item. Instant is used automatically for people who prefer reduced motion.">
            <div className="grid gap-2.5">
              {SCROLL_ANIMATIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => patch({ scroll: a.id })}
                  className={`text-left rounded-2xl p-3.5 border ${resolved.scroll === a.id ? "bg-accent-soft border-accent" : "bg-surface border-border"}`}
                >
                  <span className="block text-sm font-semibold text-ink">{a.label}</span>
                  <span className="block text-xs text-ink-muted mt-0.5 leading-snug">{a.blurb}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Position">
            <div className="flex gap-2">
              <button type="button" className={chip(resolved.position === "top")} onClick={() => patch({ position: "top" })}>
                Top
              </button>
              <button type="button" className={chip(resolved.position === "bottom")} onClick={() => patch({ position: "bottom" })}>
                Bottom
              </button>
            </div>
          </Field>
          <Field label="Style">
            <div className="flex gap-2">
              <button type="button" className={chip(resolved.look === "bar")} onClick={() => patch({ look: "bar" })}>
                Full-width bar
              </button>
              <button type="button" className={chip(resolved.look === "pill")} onClick={() => patch({ look: "pill" })}>
                Floating pill
              </button>
            </div>
          </Field>
        </>
      )}
    </>
  );
}
