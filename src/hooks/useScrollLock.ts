// src/hooks/useScrollLock.ts
import { useEffect } from "react";

// Module-level, not per-hook-instance — several overlays can be
// mounted at once (e.g. DropdownMenu's "More" panel opened from
// inside MessageActionMenu, or ReshareSheet's quote step stacked on
// its own choose step), and the body's scroll should only unlock
// once EVERY one of them has closed, not the first one to unmount.
let lockCount = 0;
let previousOverflow: string | null = null;

/**
 * Locks background scroll for as long as the calling component is
 * mounted (and `enabled` is true) — call unconditionally from any
 * overlay that fully covers the screen and is meant to block
 * interaction with whatever's behind it: bottom sheets, modals,
 * dialogs, the dropdown/kebab menu panel, lightboxes. Mirrors
 * useBackDismiss's shape on purpose (same "call once, unconditionally,
 * from a component that's only ever mounted while open" contract) —
 * most overlays call both side by side.
 *
 * Ref-counted at module scope: the first lock captures body's real
 * current overflow value and sets it to "hidden"; every lock after
 * that just increments the counter; only the LAST one to unmount
 * restores the original value. This is what makes nested/simultaneous
 * overlays safe — without it, the first overlay to close would already
 * reset overflow to "" (or whatever it captured) while a second one
 * was still open and expecting scroll to stay locked, or two overlays
 * closing back-to-back could each try to restore a stale captured
 * value and clobber each other.
 *
 * Pass `enabled = false` for a component that's only a real
 * full-screen overlay in SOME of its render modes (e.g.
 * EmojiPickerSheet's "input" mode, which renders inline under the
 * compose bar rather than as a takeover) — hooks can't be called
 * conditionally, but the lock itself can be skipped.
 */
export function useScrollLock(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow ?? "";
        previousOverflow = null;
      }
    };
  }, [enabled]);
}
