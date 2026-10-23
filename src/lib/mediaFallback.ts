// src/lib/mediaFallback.ts
//
// Global safety net for missing media (e.g. a file that exists in the production Supabase
// project's storage but not in the temporary one). Any <img> / <video> / <audio> that fails to
// load is swapped for a deterministic gradient placeholder with a kind-specific icon, so the
// UI never shows a broken-image glyph or a blank hole.
//
// Opt out per element with `data-no-fallback` (components that render their own fallback,
// e.g. Avatar → initials).
//
// Only attributes are mutated (never the DOM tree), so React reconciliation is unaffected:
// if a component later renders a new src, the browser simply loads it.

export type MediaKind = "image" | "video" | "audio" | "avatar";

const GRADIENTS: [string, string][] = [
  ["#f97316", "#ec4899"],
  ["#6366f1", "#06b6d4"],
  ["#10b981", "#3b82f6"],
  ["#f59e0b", "#ef4444"],
  ["#8b5cf6", "#ec4899"],
  ["#14b8a6", "#6366f1"],
  ["#f43f5e", "#f59e0b"],
  ["#0ea5e9", "#8b5cf6"],
];

// lucide icon bodies (24x24 viewBox, stroke-based)
const ICONS: Record<MediaKind, string> = {
  image:
    '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  video:
    '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  audio: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  avatar: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
};

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function gradientFor(seed: string): [string, string] {
  return GRADIENTS[hash(seed) % GRADIENTS.length];
}

const cache = new Map<string, string>();

/** A self-contained SVG data-URI placeholder (square, so layouts that size by aspect ratio keep a sane height). */
export function placeholderDataUri(kind: MediaKind, seed = ""): string {
  const key = `${kind}:${hash(seed) % GRADIENTS.length}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [a, b] = gradientFor(seed);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>` +
    `<rect width="400" height="400" fill="url(#g)"/>` +
    `<g transform="translate(160 160) scale(3.33)" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[kind]}</g>` +
    `</svg>`;
  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  cache.set(key, uri);
  return uri;
}

const MARK = "data-media-fallback";

function handleImage(img: HTMLImageElement) {
  if (img.hasAttribute("data-no-fallback") || img.hasAttribute(MARK)) return;
  const seed = img.currentSrc || img.src || img.alt || "";
  img.setAttribute(MARK, "image");
  img.removeAttribute("srcset");
  img.removeAttribute("sizes");
  img.src = placeholderDataUri("image", seed);
}

function handleVideo(video: HTMLVideoElement) {
  if (video.hasAttribute("data-no-fallback") || video.hasAttribute(MARK)) return;
  const seed = video.currentSrc || video.getAttribute("src") || "";
  video.setAttribute(MARK, "video");
  video.poster = placeholderDataUri("video", seed);
  video.preload = "none";
}

function handleAudio(audio: HTMLAudioElement) {
  if (audio.hasAttribute("data-no-fallback") || audio.hasAttribute(MARK)) return;
  audio.setAttribute(MARK, "audio");
  audio.title = "Audio unavailable";
}

function onMediaError(e: Event) {
  const target = e.target;
  if (!(target instanceof Element)) return;
  if (target instanceof HTMLImageElement) return handleImage(target);
  if (target instanceof HTMLVideoElement) return handleVideo(target);
  if (target instanceof HTMLAudioElement) return handleAudio(target);
  if (target instanceof HTMLSourceElement) {
    // <source> errors fire on the child. Only give up once the last candidate has failed.
    const parent = target.parentElement;
    if (!target.nextElementSibling) {
      if (parent instanceof HTMLVideoElement) handleVideo(parent);
      else if (parent instanceof HTMLAudioElement) handleAudio(parent);
    }
  }
}

let installed = false;

/** Call once at startup. `error` doesn't bubble, so it's caught in the capture phase on document. */
export function installMediaFallback(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener("error", onMediaError, true);

  // Images that already failed before this ran (complete but zero-size).
  document.querySelectorAll("img").forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) handleImage(img);
  });

  const style = document.createElement("style");
  style.textContent =
    `audio[${MARK}]{opacity:.5;pointer-events:none;border-radius:9999px;` +
    `background:linear-gradient(135deg,#6366f1,#ec4899)}` +
    `img[${MARK}],video[${MARK}]{object-fit:cover}`;
  document.head.appendChild(style);
}
