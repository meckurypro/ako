// src/lib/downloadChatFile.ts
// Opens/saves a chat document or photo: asks storage for a signed URL that carries a
// download disposition (a plain <a download> is ignored for cross-origin URLs), then clicks it.
import type { MediaItem } from "./chatMedia";
import { getSignedMediaUrl } from "./signedMediaUrl";

export async function openChatFile(item: MediaItem): Promise<void> {
  const url = item.path ? await getSignedMediaUrl(item.path, { download: item.name }) : (item.url ?? null);
  if (!url) throw new Error("file_unavailable");
  const a = document.createElement("a");
  a.href = url;
  a.download = item.name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
