// src/lib/resumableUpload.ts
//
// Resumable (TUS) upload to Supabase Storage in 6 MB chunks, built to survive a flaky phone connection.
// The Android-APK uploader taught most of this (fresh auth token per request, retries for minutes, friendly
// errors, progress); the stall watchdog below is what both of them were missing.
//
// WHY THE WATCHDOG: tus-js-client's browser HTTP stack only settles a request on the XHR's `load` or `error`
// event — never on `timeout` or `abort`. When a mobile connection goes quiet mid-request (no error, no
// response, just silence), the request hangs forever: no error, no retry, and the UI sits on "Uploading…"
// indefinitely. Here, a request that moves no bytes for STALL_MS is aborted and failed by hand, which hands it
// to tus's normal retry path — and tus resumes from the last chunk the server confirmed.
import * as tus from "tus-js-client";
import { supabase } from "./supabase";

// Supabase Storage requires exactly 6 MB chunks for resumable uploads.
export const RESUMABLE_CHUNK_SIZE = 6 * 1024 * 1024;
// A request that has sent nothing for this long is considered dead.
const STALL_MS = 30_000;
// Once the whole body is sent, the server may take a while to answer (it assembles the object on the last chunk).
const SERVER_WAIT_MS = 120_000;
const WATCHDOG_TICK_MS = 5_000;
// Keep retrying for a few minutes before giving up on a bad connection.
const RETRY_DELAYS = [0, 2000, 5000, 10_000, 20_000, 30_000, 60_000];

export const UPLOAD_CANCELLED = "Upload cancelled.";

export interface ResumableUploadOptions {
  file: File;
  bucket: string;
  /** Object path inside the bucket. */
  path: string;
  /** 0–100. Fires again as soon as bytes move after a stall, so callers can clear a "reconnecting" state. */
  onProgress: (pct: number) => void;
  /** A request stalled and is being retried. */
  onStall?: () => void;
}

export interface ResumableUploadHandle {
  promise: Promise<void>;
  /** Stops the upload; `promise` rejects with UPLOAD_CANCELLED. */
  abort: () => void;
}

function guardAgainstStall(xhr: XMLHttpRequest, onStall: () => void) {
  let last = Date.now();
  let bodySent = false;
  const bump = () => {
    last = Date.now();
  };
  xhr.upload?.addEventListener("progress", bump);
  xhr.upload?.addEventListener("load", () => {
    bodySent = true;
    bump();
  });
  const timer = setInterval(() => {
    if (Date.now() - last < (bodySent ? SERVER_WAIT_MS : STALL_MS)) return;
    clearInterval(timer);
    onStall();
    xhr.abort();
    // tus never settles an aborted request on its own (see the file header), so fail it explicitly.
    xhr.onerror?.(new ProgressEvent("error"));
  }, WATCHDOG_TICK_MS);
  xhr.addEventListener("loadend", () => clearInterval(timer));
}

function friendlyError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : "";
  if (/exceeded the maximum allowed size|413|payload too large/i.test(msg)) {
    return new Error("The server rejected the file as too large.");
  }
  return new Error("Upload interrupted. Check your connection and try again — it will resume where it stopped.");
}

export function startResumableUpload({ file, bucket, path, onProgress, onStall }: ResumableUploadOptions): ResumableUploadHandle {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  let upload: tus.Upload | null = null;
  let cancelled = false;
  let rejectOuter: (err: Error) => void = () => {};

  const promise = new Promise<void>((resolve, reject) => {
    rejectOuter = reject;
    upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: RETRY_DELAYS,
      headers: { apikey: anonKey, "x-upsert": "false" },
      // Re-read the access token before EVERY request, so a slow upload that outlives the 1-hour session token
      // keeps going instead of failing with 401 halfway.
      onBeforeRequest: async (req) => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) req.setHeader("authorization", `Bearer ${token}`);
        const xhr = req.getUnderlyingObject() as XMLHttpRequest | undefined;
        if (xhr) guardAgainstStall(xhr, () => onStall?.());
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      chunkSize: RESUMABLE_CHUNK_SIZE,
      onError: (err) => reject(friendlyError(err)),
      onProgress: (sent, total) => onProgress(Math.min(100, Math.round((sent / total) * 100))),
      onSuccess: () => resolve(),
    });
    const started = upload;
    started
      .findPreviousUploads()
      .then((previous) => {
        if (cancelled) return;
        // Pick up where an interrupted attempt of this exact file left off.
        if (previous.length) started.resumeFromPreviousUpload(previous[0]);
        started.start();
      })
      .catch(() => {
        if (!cancelled) started.start();
      });
  });

  return {
    promise,
    abort: () => {
      cancelled = true;
      void upload?.abort(true).catch(() => {});
      rejectOuter(new Error(UPLOAD_CANCELLED));
    },
  };
}
