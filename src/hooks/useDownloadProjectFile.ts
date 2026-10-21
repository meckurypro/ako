// src/hooks/useDownloadProjectFile.ts
// Downloads a File project's hosted file in the app (not by opening the signed URL in a tab) so the app can
// tell when the WHOLE file arrived — the only moment a download counts. Flow:
//   1. get-project-file checks access, opens a download attempt (download_id) and returns a signed URL.
//   2. The file is streamed and counted byte by byte. Desktop Chromium writes straight to disk (so a 1GB file
//      never sits in memory); everywhere else the chunks are folded into a Blob that the browser keeps off-heap.
//   3. Only if every byte arrived is the attempt completed (complete_file_download): that bumps the project's
//      download_count and notifies the creator. A cancelled/interrupted download counts for nothing.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

interface DownloadArgs {
  projectId: string;
  /** Used to name the saved file (title + the stored file's extension). */
  title: string;
  filePath: string | null;
}

// Fold buffered chunks into a Blob this often so the JS heap never holds hundreds of MB of Uint8Arrays.
const BLOB_FLUSH_BYTES = 32 * 1024 * 1024;

export class DownloadCancelledError extends Error {
  constructor() {
    super("Download cancelled");
    this.name = "DownloadCancelledError";
  }
}

function suggestedFileName(title: string, filePath: string | null): string {
  const ext = filePath && filePath.includes(".") ? filePath.split(".").pop() : null;
  const base = title.trim().replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").slice(0, 80) || "download";
  return ext ? `${base}.${ext}` : base;
}

type SaveHandle = { createWritable: () => Promise<WritableStream<Uint8Array> & { close: () => Promise<void>; abort: () => Promise<void> }> };

export function useDownloadProjectFile() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ projectId, title, filePath }: DownloadArgs): Promise<number | null> => {
      const fileName = suggestedFileName(title, filePath);

      // Must happen inside the click's user-activation window, i.e. BEFORE any await.
      const picker = (window as unknown as {
        showSaveFilePicker?: (o: { suggestedName: string }) => Promise<SaveHandle>;
      }).showSaveFilePicker;
      let saveHandle: SaveHandle | null = null;
      if (picker) {
        try {
          saveHandle = await picker({ suggestedName: fileName });
        } catch (err) {
          if ((err as DOMException)?.name === "AbortError") throw new DownloadCancelledError();
          saveHandle = null; // picker unavailable here (iframe etc.) — use the Blob path
        }
      }

      setProgress(0);
      try {
        const { data, error } = await supabase.functions.invoke("get-project-file", {
          body: { project_id: projectId, kind: "file", action: "download" },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const url: string = data.url;
        const downloadId: string | null = data.download_id ?? null;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Download failed (${response.status}).`);
        const total = Number(response.headers.get("content-length")) || 0;

        if (!response.body) {
          // Very old browser without streaming: hand the URL to the browser. Works, but can't be counted.
          window.location.href = url;
          return null;
        }

        const reader = response.body.getReader();
        let received = 0;
        const tick = () => setProgress(total ? Math.min(99, Math.floor((received / total) * 100)) : null);

        let writable: Awaited<ReturnType<SaveHandle["createWritable"]>> | null = null;
        let parts: BlobPart[] = [];
        let pending: BlobPart[] = [];
        let pendingBytes = 0;
        try {
          if (saveHandle) writable = await saveHandle.createWritable();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;
            received += value.byteLength;
            if (writable) {
              const w = writable.getWriter();
              await w.write(value);
              w.releaseLock();
            } else {
              pending.push(value as unknown as BlobPart);
              pendingBytes += value.byteLength;
              if (pendingBytes >= BLOB_FLUSH_BYTES) {
                parts = [new Blob([...parts, ...pending])];
                pending = [];
                pendingBytes = 0;
              }
            }
            tick();
          }
          if (total && received !== total) throw new Error("Download was interrupted — please try again.");
          if (writable) await writable.close();
        } catch (err) {
          if (writable) await writable.abort().catch(() => undefined);
          throw err;
        }

        if (!writable) {
          const blob = new Blob([...parts, ...pending], { type: response.headers.get("content-type") ?? "application/octet-stream" });
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objectUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        }

        // Whole file received and handed to the device → now (and only now) it counts.
        let newCount: number | null = null;
        if (downloadId) {
          const { data: count, error: completeError } = await supabase.rpc("complete_file_download", {
            p_download_id: downloadId,
            p_bytes: received,
          });
          if (completeError) console.warn("complete_file_download failed:", completeError);
          else newCount = typeof count === "number" ? count : null;
        }
        setProgress(100);
        return newCount;
      } finally {
        setTimeout(() => setProgress(null), 800);
      }
    },
    onSuccess: (_count, vars) => {
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["project-detail", vars.projectId] });
      queryClient.invalidateQueries({ queryKey: ["resolve-project-slug"] });
      queryClient.invalidateQueries({ queryKey: ["page-projects"] });
      queryClient.invalidateQueries({ queryKey: ["user-projects"] });
      queryClient.invalidateQueries({ queryKey: ["profile-projects"] });
    },
  });

  return Object.assign(mutation, { progress });
}
