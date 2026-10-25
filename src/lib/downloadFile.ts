// src/lib/downloadFile.ts
// Starts a file download after a short "preparing" check, so the person gets feedback instead of a silent pause.
//
// The check is a HEAD request: it confirms the file is still there (and how big it is) before we hand the URL to the
// browser. The download itself is then streamed by the browser from the `?download=` URL (Supabase answers it with
// Content-Disposition: attachment), so even a 100 MB file never has to sit in the page's memory. If the check can't
// run (a network hiccup, or the host not answering HEAD), we still try the download — it is only a courtesy check.

export type PrepareResult = { ok: true; bytes: number | null } | { ok: false; reason: "offline" | "missing" | "slow" };

const CHECK_TIMEOUT_MS = 8000;
/** So the loading state is seen as a state, not a flicker. */
const MIN_PREPARE_MS = 450;

export async function prepareDownload(url: string): Promise<PrepareResult> {
  const started = Date.now();
  const wait = async () => {
    const left = MIN_PREPARE_MS - (Date.now() - started);
    if (left > 0) await new Promise((r) => setTimeout(r, left));
  };

  if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: false, reason: "offline" };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: "HEAD", signal: ctrl.signal, cache: "no-store" });
    await wait();
    if (res.status === 404 || res.status === 400 || res.status === 403) return { ok: false, reason: "missing" };
    const len = Number(res.headers.get("content-length"));
    return { ok: true, bytes: Number.isFinite(len) && len > 0 ? len : null };
  } catch (err) {
    await wait();
    if ((err as { name?: string })?.name === "AbortError") return { ok: false, reason: "slow" };
    // Blocked or failed check — don't stand in the way of the download itself.
    return { ok: true, bytes: null };
  } finally {
    clearTimeout(timer);
  }
}

/** Hands the URL to the browser's own download manager. Must run soon after the tap. */
export function startBrowserDownload(url: string, fileName: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
