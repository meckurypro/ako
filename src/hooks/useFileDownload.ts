// src/hooks/useFileDownload.ts
// "Preparing…" while we check the file, then a toast once the browser has been handed the download.
import { useCallback, useRef, useState } from "react";
import { prepareDownload, startBrowserDownload } from "../lib/downloadFile";
import { useToast } from "../components/Toast";

const MESSAGES = {
  offline: "You're offline. Check your connection and try again.",
  missing: "That file isn't available any more.",
  slow: "That took too long. Please try again.",
} as const;

export function useFileDownload() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const start = useCallback(
    async (url: string | null, fileName: string) => {
      if (!url || running.current) return;
      running.current = true;
      setBusy(true);
      try {
        const res = await prepareDownload(url);
        if (!res.ok) {
          toast(MESSAGES[res.reason], { variant: "error" });
          return;
        }
        startBrowserDownload(url, fileName);
        toast("Download started", { variant: "success" });
      } finally {
        running.current = false;
        setBusy(false);
      }
    },
    [toast],
  );

  return { busy, start };
}
