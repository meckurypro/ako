// src/lib/chatMediaStore.ts
//
// WhatsApp-style manual media download for chat. Media someone sent you is NOT pulled down until you
// click it; the click downloads it (live progress ring, ✕ to cancel) and keeps it ON THE DEVICE in the
// browser's persistent Cache Storage, so reopening the chat — even offline — shows it instantly without
// re-downloading or re-signing. Documents are additionally handed to the browser's own download so the
// file lands in the user's Downloads folder (see downloadChatFile.ts).
//
// Downloads are shared per storage path, so the bubble tile and the full-screen viewer always agree and
// a second click never starts a second download.
import { useEffect, useSyncExternalStore } from "react";
import type { MediaItem } from "./chatMedia";
import { getSignedMediaUrl } from "./signedMediaUrl";

export interface DownloadState {
  status: "idle" | "downloading" | "failed";
  /** 0..1, or -1 when the total size is unknown. */
  progress: number;
}

const IDLE: DownloadState = { status: "idle", progress: 0 };
const CACHE_NAME = "ako-chat-media-v1";

const states = new Map<string, DownloadState>();
const controllers = new Map<string, AbortController>();
const inflight = new Map<string, Promise<string>>();
/** path → object URL of the on-device copy. */
const localUrls = new Map<string, string>();
/** Paths we've already looked for in Cache Storage (so the UI can tell "not downloaded" from "still checking"). */
const checked = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version += 1;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

function setState(key: string, next: DownloadState) {
  if (next.status === "idle") states.delete(key);
  else states.set(key, next);
  emit();
}

const cacheRequest = (path: string) => new Request(`${location.origin}/__chat-media__/${encodeURIComponent(path)}`);

async function openCache(): Promise<Cache | null> {
  try {
    return "caches" in window ? await caches.open(CACHE_NAME) : null;
  } catch {
    return null; // private mode / storage blocked — downloads still work, they just aren't kept
  }
}

export function getLocalUrl(item: MediaItem | undefined): string | null {
  return item?.path ? (localUrls.get(item.path) ?? null) : null;
}

/** Looks for an on-device copy of `item` once. */
export async function probeDownloaded(item: MediaItem): Promise<void> {
  const key = item.path;
  if (!key || checked.has(key)) return;
  checked.add(key);
  const cache = await openCache();
  const hit = cache ? await cache.match(cacheRequest(key)) : undefined;
  if (hit) {
    localUrls.set(key, URL.createObjectURL(await hit.blob()));
  }
  emit();
}

/** Downloads (once), keeps a copy on the device, and resolves to an object URL for it. */
export function downloadChatMedia(item: MediaItem): Promise<string> {
  const key = item.path;
  if (!key) return Promise.reject(new Error("not_downloadable"));
  const existing = localUrls.get(key);
  if (existing) return Promise.resolve(existing);
  const running = inflight.get(key);
  if (running) return running;

  const controller = new AbortController();
  controllers.set(key, controller);
  setState(key, { status: "downloading", progress: 0 });

  const job = (async () => {
    try {
      // Best practice for "keep it on the device": ask the browser not to evict our cache under pressure.
      void navigator.storage?.persist?.().catch(() => {});

      const cache = await openCache();
      const cached = cache ? await cache.match(cacheRequest(key)) : undefined;
      let blob: Blob;
      if (cached) {
        blob = await cached.blob();
      } else {
        const remote = await getSignedMediaUrl(key);
        if (!remote) throw new Error("file_unavailable");
        const res = await fetch(remote, { signal: controller.signal });
        if (!res.ok) throw new Error(`download_failed_${res.status}`);
        const total = Number(res.headers.get("content-length")) || item.size || 0;
        if (res.body && total > 0) {
          const reader = res.body.getReader();
          const parts: Uint8Array[] = [];
          let received = 0;
          let last = 0;
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            parts.push(value);
            received += value.length;
            const p = Math.min(0.99, received / total);
            if (p - last >= 0.02) {
              last = p;
              setState(key, { status: "downloading", progress: p });
            }
          }
          blob = new Blob(parts as BlobPart[], { type: res.headers.get("content-type") ?? item.mime });
        } else {
          setState(key, { status: "downloading", progress: -1 });
          blob = await res.blob();
        }
        if (cache) {
          await cache.put(cacheRequest(key), new Response(blob, { headers: { "Content-Type": blob.type || item.mime } })).catch(() => {});
        }
      }
      const url = URL.createObjectURL(blob);
      localUrls.set(key, url);
      checked.add(key);
      setState(key, { status: "idle", progress: 0 });
      return url;
    } catch (e) {
      setState(key, controller.signal.aborted ? { status: "idle", progress: 0 } : { status: "failed", progress: 0 });
      throw e;
    } finally {
      inflight.delete(key);
      controllers.delete(key);
    }
  })();
  inflight.set(key, job);
  job.catch(() => {}); // outcome is reported through state; un-awaited callers mustn't crash
  return job;
}

export function cancelChatMediaDownload(item: MediaItem | undefined): void {
  if (item?.path) controllers.get(item.path)?.abort();
}

/** Live download state + the on-device copy (if any) for one chat media item. */
export function useChatMediaDownload(item: MediaItem | undefined) {
  const key = item?.path ?? "";
  const state = useSyncExternalStore(subscribe, () => states.get(key) ?? IDLE);
  useSyncExternalStore(subscribe, () => version); // re-render when a cache probe / download lands
  useEffect(() => {
    if (item?.path) void probeDownloaded(item);
  }, [item]);
  return {
    localUrl: getLocalUrl(item),
    /** True until we've looked in Cache Storage — don't flash a "download" button for something already saved. */
    checking: !!item?.path && !checked.has(item.path),
    status: state.status,
    progress: state.progress,
    start: () => (item ? downloadChatMedia(item) : Promise.reject(new Error("no_item"))),
    cancel: () => cancelChatMediaDownload(item),
  };
}
