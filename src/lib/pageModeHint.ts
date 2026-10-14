// src/lib/pageModeHint.ts
// ============================================================
// The cached "this person was last acting as a page" hint that
// index.html's pre-mount script reads to avoid a colour flash on load.
//
// It used to be a bare "page" / "personal" flag, so ANY account opened
// next on the same browser inherited the previous account's page palette
// (switch accounts → new account renders in page colours). It is now
// tagged with the user it belongs to and only honoured for that user;
// index.html applies the same check against the stored session.
// ============================================================

const MODE_STORAGE_KEY = "ako-active-mode";

export function writePageModeHint(userId: string | undefined, isPage: boolean): void {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, isPage && userId ? `page:${userId}` : "personal");
  } catch {
    // localStorage unavailable (privacy mode) — only the cold-load flash
    // prevention is lost, nothing functional.
  }
}

export function clearPageModeHint(): void {
  writePageModeHint(undefined, false);
}
