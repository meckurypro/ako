// src/lib/downloadChatFile.ts
// Saves a chat document or photo to the user's computer. The file is downloaded once into the on-device
// store (chatMediaStore.ts — with progress in the UI), then handed to the browser as a normal download
// from that local copy, so repeat saves are instant and need no network.
import type { MediaItem } from "./chatMedia";
import { downloadChatMedia } from "./chatMediaStore";
import { getSignedMediaUrl } from "./signedMediaUrl";

function triggerDownload(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function openChatFile(item: MediaItem): Promise<void> {
  if (item.path) {
    try {
      triggerDownload(await downloadChatMedia(item), item.name);
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") throw e; // the user cancelled — not a failure
      // fall through: some networks block cross-origin fetch; the signed download link still works
    }
    const url = await getSignedMediaUrl(item.path, { download: item.name });
    if (!url) throw new Error("file_unavailable");
    triggerDownload(url, item.name);
    return;
  }
  if (!item.url) throw new Error("file_unavailable");
  triggerDownload(item.url, item.name);
}
