import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import * as tus from "tus-js-client";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

const DEFAULT_MAX_FILE_SIZE = 500 * 1024 * 1024;
// Above this, a single POST is too fragile (one dropped packet restarts the whole upload), so the file goes up
// in resumable 6MB chunks instead — 6MB is the chunk size Supabase Storage requires for resumable uploads.
const RESUMABLE_THRESHOLD = 6 * 1024 * 1024;
const CHUNK_SIZE = 6 * 1024 * 1024;

interface Options {
  /** Largest file accepted, in bytes. File projects pass 1GB (the private-content bucket's limit). */
  maxBytes?: number;
}

function formatLimit(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${Math.round(mb / 1024)}GB` : `${Math.round(mb)}MB`;
}

/**
 * Uploads a digital product file to the private-content bucket.
 * Unlike avatars/post-media, this bucket has NO public read policy —
 * the returned path is stored on the project row, and actual access
 * only ever happens through get-project-file, which mints a signed
 * URL after verifying purchase/ownership.
 *
 * Small files use the plain upload; large ones use Supabase's resumable (TUS) endpoint and report `progress`
 * (0–100) so the UI can show it.
 */
export function useUploadProjectFile(options: Options = {}) {
  const { user } = useAuth();
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_FILE_SIZE;
  const [progress, setProgress] = useState(0);

  const uploadResumable = useCallback(
    async (file: File, path: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Not signed in");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: { authorization: `Bearer ${accessToken}`, apikey: anonKey, "x-upsert": "false" },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: "private-content",
            objectName: path,
            contentType: file.type || "application/octet-stream",
            cacheControl: "3600",
          },
          chunkSize: CHUNK_SIZE,
          onError: (err) => reject(err),
          onProgress: (sent, total) => setProgress(Math.min(100, Math.round((sent / total) * 100))),
          onSuccess: () => resolve(),
        });
        upload.findPreviousUploads().then((previous) => {
          // Pick up where an interrupted attempt of this exact file left off.
          if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
          upload.start();
        });
      });
    },
    [],
  );

  const mutation = useMutation({
    mutationFn: async (file: File): Promise<string> => {
      if (!user) throw new Error("Not signed in");

      if (file.size > maxBytes) {
        throw new Error(`File must be under ${formatLimit(maxBytes)}.`);
      }

      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      setProgress(0);
      if (file.size > RESUMABLE_THRESHOLD) {
        await uploadResumable(file, path);
      } else {
        const { error: uploadError } = await supabase.storage.from("private-content").upload(path, file);
        if (uploadError) throw uploadError;
      }
      setProgress(100);

      // Return the PATH, not a public URL — this bucket has no public
      // read policy, so there is no public URL. The path is what
      // get-project-file uses to mint a signed URL later.
      return path;
    },
  });

  return Object.assign(mutation, { progress });
}
