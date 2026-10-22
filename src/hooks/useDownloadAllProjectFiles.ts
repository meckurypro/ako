// src/hooks/useDownloadAllProjectFiles.ts
// "Download all" for a multi-file File project — as ONE zip, or as separate files one after another. (Downloading a
// single file is useDownloadProjectFile; this is its batch sibling.) Same rules as there:
//   1. get-project-file { all: true } checks access ONCE, opens ONE download attempt and returns every file's signed
//      URL with its final name (the creator's slot title, else the uploaded file's own name; duplicates made unique).
//   2. Every file is streamed in-app and counted byte by byte. Desktop Chromium writes straight to disk (a zip or a
//      chosen folder), so a multi-GB batch never sits in memory; elsewhere the chunks fold into off-heap Blobs.
//   3. Only if EVERY byte of EVERY file arrived is the attempt completed (complete_file_download): the whole batch
//      counts as a single download and the creator gets a single notification. Cancelled/interrupted → counts for nothing.
//
// The zip is built here (fflate, store-only: uploads are usually already compressed and storing keeps memory flat).
// fflate writes plain ZIP, whose 32-bit offsets cap an archive at 4GB, so bigger batches are offered one by one only.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Zip, ZipPassThrough } from "fflate";
import { supabase } from "../lib/supabase";
import { DownloadCancelledError } from "./useDownloadProjectFile";
import { ZIP_MAX_BYTES } from "../lib/fileProject";

export type DownloadAllMode = "zip" | "each";

interface DownloadAllArgs {
  projectId: string;
  /** Names the zip ("<title>.zip"). */
  title: string;
  mode: DownloadAllMode;
}

interface BatchFile {
  file_id: string | null;
  url: string;
  file_name: string;
  size_bytes: number | null;
}

interface SaveWritable {
  write: (chunk: Uint8Array) => Promise<void>;
  close: () => Promise<void>;
  abort: () => Promise<void>;
}
type SaveFileHandle = { createWritable: () => Promise<SaveWritable> };
type DirHandle = { getFileHandle: (name: string, o: { create: boolean }) => Promise<SaveFileHandle> };

// Fold buffered chunks into a Blob this often so the JS heap never holds hundreds of MB of Uint8Arrays.
const BLOB_FLUSH_BYTES = 32 * 1024 * 1024;

/** Something to write bytes to: a file on disk (File System Access) or an in-memory-light Blob that is saved at the end. */
interface Sink {
  write: (chunk: Uint8Array) => Promise<void>;
  finish: () => Promise<void>;
  abort: () => Promise<void>;
}

function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 150) || "download";
}

function saveBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

function diskSink(writable: SaveWritable): Sink {
  return {
    write: (chunk) => writable.write(chunk),
    finish: () => writable.close(),
    abort: () => writable.abort().catch(() => undefined),
  };
}

function blobSink(fileName: string, type: string): Sink {
  let parts: BlobPart[] = [];
  let pending: BlobPart[] = [];
  let pendingBytes = 0;
  return {
    write: async (chunk) => {
      pending.push(chunk as unknown as BlobPart);
      pendingBytes += chunk.byteLength;
      if (pendingBytes >= BLOB_FLUSH_BYTES) {
        parts = [new Blob([...parts, ...pending])];
        pending = [];
        pendingBytes = 0;
      }
    },
    finish: async () => saveBlob(new Blob([...parts, ...pending], { type }), fileName),
    abort: async () => {
      parts = [];
      pending = [];
    },
  };
}

export function useDownloadAllProjectFiles() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<number | null>(null);
  /** "File 2 of 4" while a batch runs. */
  const [status, setStatus] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ projectId, title, mode }: DownloadAllArgs): Promise<number | null> => {
      const win = window as unknown as {
        showSaveFilePicker?: (o: { suggestedName: string; types?: unknown[] }) => Promise<SaveFileHandle>;
        showDirectoryPicker?: (o: { mode: "readwrite" }) => Promise<DirHandle>;
      };

      // Pickers must open inside the click's user-activation window, i.e. BEFORE any await.
      const zipName = `${safeName(title)}.zip`;
      let zipHandle: SaveFileHandle | null = null;
      let dirHandle: DirHandle | null = null;
      try {
        if (mode === "zip" && win.showSaveFilePicker) {
          zipHandle = await win.showSaveFilePicker({
            suggestedName: zipName,
            types: [{ description: "ZIP archive", accept: { "application/zip": [".zip"] } }],
          });
        } else if (mode === "each" && win.showDirectoryPicker) {
          dirHandle = await win.showDirectoryPicker({ mode: "readwrite" });
        }
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") throw new DownloadCancelledError();
        zipHandle = null; // picker unavailable here (iframe etc.) — fall back to browser downloads
        dirHandle = null;
      }

      setProgress(0);
      setStatus("Preparing…");
      try {
        const { data, error } = await supabase.functions.invoke("get-project-file", {
          body: { project_id: projectId, kind: "file", action: "download", all: true },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const files: BatchFile[] = Array.isArray(data?.files) ? data.files : [];
        const downloadId: string | null = data?.download_id ?? null;
        if (files.length === 0) throw new Error("This project has no files to download.");

        const knownTotal = files.every((f) => f.size_bytes && f.size_bytes > 0)
          ? files.reduce((sum, f) => sum + (f.size_bytes ?? 0), 0)
          : 0;
        if (mode === "zip" && knownTotal > ZIP_MAX_BYTES) {
          throw new Error("These files add up to more than 4 GB, too big for one zip. Download them one by one instead.");
        }

        let received = 0;
        const tick = (index: number, fileReceived: number, fileTotal: number) => {
          setStatus(`File ${index + 1} of ${files.length}`);
          if (knownTotal) setProgress(Math.min(99, Math.floor((received / knownTotal) * 100)));
          else setProgress(Math.min(99, Math.floor(((index + (fileTotal ? fileReceived / fileTotal : 0)) / files.length) * 100)));
        };

        /** Streams one file's bytes into `onChunk`, enforcing that every byte arrived. */
        async function streamFile(file: BatchFile, index: number, onChunk: (chunk: Uint8Array) => Promise<void>) {
          const response = await fetch(file.url);
          if (!response.ok || !response.body) throw new Error(`Couldn't download "${file.file_name}" (${response.status}).`);
          const total = Number(response.headers.get("content-length")) || 0;
          const reader = response.body.getReader();
          let fileReceived = 0;
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;
            fileReceived += value.byteLength;
            received += value.byteLength;
            await onChunk(value);
            tick(index, fileReceived, total);
          }
          if (total && fileReceived !== total) throw new Error(`"${file.file_name}" was interrupted — please try again.`);
        }

        if (mode === "zip") {
          const sink = zipHandle ? diskSink(await zipHandle.createWritable()) : blobSink(zipName, "application/zip");
          try {
            const zip = new Zip();
            let chain: Promise<void> = Promise.resolve();
            let zipError: unknown = null;
            let zipBytes = 0;
            zip.ondata = (err, chunk) => {
              if (err) {
                zipError = err;
                return;
              }
              zipBytes += chunk.length;
              if (zipBytes > ZIP_MAX_BYTES) zipError = new Error("These files are too big for one zip. Download them one by one instead.");
              chain = chain.then(() => sink.write(chunk));
            };

            for (let i = 0; i < files.length; i++) {
              const entry = new ZipPassThrough(safeName(files[i].file_name));
              zip.add(entry);
              await streamFile(files[i], i, async (chunk) => {
                entry.push(chunk);
                await chain; // backpressure: never let queued writes pile up in memory
                if (zipError) throw zipError;
              });
              entry.push(new Uint8Array(0), true);
            }
            zip.end();
            await chain;
            if (zipError) throw zipError;
            await sink.finish();
          } catch (err) {
            await sink.abort();
            throw err;
          }
        } else {
          for (let i = 0; i < files.length; i++) {
            const name = safeName(files[i].file_name);
            let sink: Sink;
            if (dirHandle) {
              const fileHandle = await dirHandle.getFileHandle(name, { create: true });
              sink = diskSink(await fileHandle.createWritable());
            } else {
              sink = blobSink(name, "application/octet-stream");
            }
            try {
              await streamFile(files[i], i, (chunk) => sink.write(chunk));
              await sink.finish();
            } catch (err) {
              await sink.abort();
              throw err;
            }
            // Without a chosen folder the browser may ask "allow multiple downloads?" — a short gap keeps it from
            // swallowing the later ones.
            if (!dirHandle && i < files.length - 1) await new Promise((r) => setTimeout(r, 500));
          }
        }

        // Every byte of every file arrived → the whole batch counts as ONE download.
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
        setTimeout(() => {
          setProgress(null);
          setStatus(null);
        }, 800);
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

  return Object.assign(mutation, { progress, status });
}
