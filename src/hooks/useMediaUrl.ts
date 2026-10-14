// src/hooks/useMediaUrl.ts
// Resolves a chat media item to something an <img> can load: the on-device copy once it's been downloaded,
// the local blob URL while the message is still uploading, otherwise a (cached) signed URL for its storage
// path. `enabled: false` (a received item the user hasn't clicked to download yet) resolves nothing and
// makes no request.
import { useEffect, useState } from "react";
import type { MediaItem } from "../lib/chatMedia";
import { getLocalUrl } from "../lib/chatMediaStore";
import { getSignedMediaUrl } from "../lib/signedMediaUrl";

export function useMediaUrl(item: MediaItem | undefined, options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const local = item?.url;
  const path = item?.path;
  const downloaded = getLocalUrl(item);
  const [url, setUrl] = useState<string | null>(local ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (downloaded) {
      setUrl(downloaded);
      return;
    }
    if (local) {
      setUrl(local);
      return;
    }
    if (!path || !enabled) return;
    let cancelled = false;
    void getSignedMediaUrl(path).then((signed) => {
      if (cancelled) return;
      if (signed) setUrl(signed);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [local, path, enabled, downloaded]);

  return { url: downloaded ?? url, failed, uploading: !!local && !path };
}
