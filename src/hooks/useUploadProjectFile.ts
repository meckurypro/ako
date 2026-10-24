import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { startResumableUpload, UPLOAD_CANCELLED, type ResumableUploadHandle } from "../lib/resumableUpload";
import { useAuth } from "./useAuth";

const DEFAULT_MAX_FILE_SIZE = 500 * 1024 * 1024;
// Above this, a single POST is too fragile (one dropped packet restarts the whole upload), so the file goes up
// in resumable 6MB chunks instead — see lib/resumableUpload.ts.
const RESUMABLE_THRESHOLD = 6 * 1024 * 1024;

export { UPLOAD_CANCELLED };

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
 * (0–100). `retrying` is true while a stalled connection is being re-established, and `cancel()` stops an upload
 * in flight (the mutation then rejects with UPLOAD_CANCELLED, which callers should not show as an error).
 */
export function useUploadProjectFile(options: Options = {}) {
  const { user } = useAuth();
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_FILE_SIZE;
  const [progress, setProgress] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const handleRef = useRef<ResumableUploadHandle | null>(null);

  const cancel = useCallback(() => handleRef.current?.abort(), []);
  // Leaving the form (or turning the channel off) abandons the upload rather than letting it run unseen.
  useEffect(() => () => handleRef.current?.abort(), []);

  const mutation = useMutation({
    mutationFn: async (file: File): Promise<string> => {
      if (!user) throw new Error("Not signed in");

      if (file.size > maxBytes) {
        throw new Error(`File must be under ${formatLimit(maxBytes)}.`);
      }

      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      setProgress(0);
      setRetrying(false);
      if (file.size > RESUMABLE_THRESHOLD) {
        const handle = startResumableUpload({
          file,
          bucket: "private-content",
          path,
          onProgress: (pct) => {
            setProgress(pct);
            setRetrying(false);
          },
          onStall: () => setRetrying(true),
        });
        handleRef.current = handle;
        try {
          await handle.promise;
        } finally {
          handleRef.current = null;
          setRetrying(false);
        }
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

  return Object.assign(mutation, { progress, retrying, cancel });
}
