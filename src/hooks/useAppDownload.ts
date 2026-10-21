// src/hooks/useAppDownload.ts
//
// "Download the mobile app" settings — one row in app_download_settings (id = 1) holding the Google
// Play / App Store links and the metadata of the uploaded Android APK, which lives in the public
// app-releases bucket. See supabase/ako_app_download.sql.
//
// Read: any signed-in user (Settings CTA + download modal). Write: admins only (RLS enforces it; the
// admin page is just the UI for it).
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as tus from "tus-js-client";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export const APP_RELEASES_BUCKET = "app-releases";
export const MAX_APK_BYTES = 300 * 1024 * 1024; // matches the bucket's file_size_limit
// Supabase requires exactly 6 MB chunks for resumable uploads.
const APK_CHUNK_SIZE = 6 * 1024 * 1024;
const APK_MIME = "application/vnd.android.package-archive";
// The name the browser saves the file as, whatever the object is called in storage.
const APK_DOWNLOAD_NAME = "Ako.apk";

export interface AppDownloadSettings {
  id: number;
  android_store_url: string | null;
  ios_store_url: string | null;
  apk_path: string | null;
  apk_file_name: string | null;
  apk_size_bytes: number | null;
  apk_uploaded_at: string | null;
  updated_at: string;
}

export const APP_DOWNLOAD_QUERY_KEY = ["app-download-settings"];

export function useAppDownloadSettings() {
  return useQuery({
    queryKey: APP_DOWNLOAD_QUERY_KEY,
    queryFn: async (): Promise<AppDownloadSettings | null> => {
      const { data, error } = await supabase
        .from("app_download_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

/** Public, download-forcing link to the current APK, or null when none has been uploaded. */
export function getApkDownloadUrl(settings: AppDownloadSettings | null | undefined): string | null {
  if (!settings?.apk_path) return null;
  const { data } = supabase.storage
    .from(APP_RELEASES_BUCKET)
    .getPublicUrl(settings.apk_path, { download: APK_DOWNLOAD_NAME });
  return data.publicUrl;
}

/** A store link must be a real http(s) URL — same rule the table's CHECK constraint enforces. */
export function isValidStoreUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function useSaveStoreUrls() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { android: string; ios: string }) => {
      const { error } = await supabase
        .from("app_download_settings")
        .update({
          // Empty string means "not published yet" -> null, which is what the user-facing toast keys off.
          android_store_url: input.android.trim() || null,
          ios_store_url: input.ios.trim() || null,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: APP_DOWNLOAD_QUERY_KEY }),
  });
}

// An APK is a ZIP archive, so it must start with "PK\x03\x04". Cheap guard against someone picking the
// wrong file (a renamed .zip/.pdf, an .aab) before a hundred megabytes go over a slow connection.
async function looksLikeZip(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return head.length === 4 && head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
}

/**
 * Resumable (TUS) upload of the APK. A 300 MB file is far too big for one request: a single dropped
 * packet or proxy timeout would restart it from zero. In 6 MB chunks it retries only the failing chunk,
 * survives a flaky connection, can resume an interrupted attempt of the same file, and reports progress.
 * The access token is re-read before EVERY request, so a slow upload that outlives the 1-hour session
 * token keeps going instead of failing with 401 halfway.
 */
function uploadApkResumable(file: File, path: string, onProgress: (pct: number) => void): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  return new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      // Keep retrying for several minutes before giving up on a bad connection.
      retryDelays: [0, 2000, 5000, 10000, 20000, 30000, 60000],
      headers: { apikey: anonKey, "x-upsert": "false" },
      onBeforeRequest: async (req) => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) req.setHeader("authorization", `Bearer ${token}`);
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: APP_RELEASES_BUCKET,
        objectName: path,
        contentType: APK_MIME,
        cacheControl: "3600",
      },
      chunkSize: APK_CHUNK_SIZE,
      onError: (err) => reject(err),
      onProgress: (sent, total) => onProgress(Math.min(100, Math.round((sent / total) * 100))),
      onSuccess: () => resolve(),
    });
    upload.findPreviousUploads().then((previous) => {
      // Pick up where an interrupted attempt of this exact file left off.
      if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    });
  });
}

export function useUploadApk() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const mutation = useMutation({
    mutationFn: async ({ file, previousPath }: { file: File; previousPath: string | null }) => {
      if (!/\.apk$/i.test(file.name)) throw new Error("That isn't an .apk file.");
      if (file.size > MAX_APK_BYTES) throw new Error("That file is over the 300 MB limit.");
      if (!(await looksLikeZip(file))) throw new Error("That file doesn't look like a valid APK.");

      // A fresh object path every time: replacing the APK never serves a stale cached copy, and a
      // failed upload can't corrupt the APK users are currently downloading.
      const newPath = `ako-${Date.now()}.apk`;
      setProgress(0);
      try {
        await uploadApkResumable(file, newPath, setProgress);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (/exceeded the maximum allowed size|413|payload too large/i.test(msg)) {
          throw new Error("The server rejected the file as too large. Check Supabase > Storage > Settings > upload file size limit.");
        }
        throw new Error("Upload interrupted. Check your connection and try again — it will resume where it stopped.");
      }
      setProgress(100);

      const { error: rowError } = await supabase
        .from("app_download_settings")
        .update({
          apk_path: newPath,
          apk_file_name: file.name,
          apk_size_bytes: file.size,
          apk_uploaded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        })
        .eq("id", 1);
      if (rowError) {
        // Don't leave an orphaned upload behind if the pointer couldn't be switched over.
        await supabase.storage.from(APP_RELEASES_BUCKET).remove([newPath]);
        throw rowError;
      }

      // Only now, with users already pointed at the new file, remove the old one. Best-effort: a
      // leftover old object is harmless, a failed cleanup shouldn't report the replacement as failed.
      if (previousPath && previousPath !== newPath) {
        await supabase.storage.from(APP_RELEASES_BUCKET).remove([previousPath]);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: APP_DOWNLOAD_QUERY_KEY }),
  });
  return Object.assign(mutation, { progress });
}

export function formatApkSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
}
