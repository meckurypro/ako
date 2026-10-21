// src/lib/floatingChrome.ts
//
// Tiny shared flag so two floating buttons never compete for the same corner: while a screen shows its own
// primary floating action ("Back to post" on a profile opened from a feed post), the app-wide scroll-to-top
// arrow stays out of the way instead of sitting beside it and covering content.
import { useEffect, useSyncExternalStore } from "react";

let primaryFabCount = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** A screen calls this while its own floating action is on screen. */
export function usePrimaryFloatingAction(active: boolean) {
  useEffect(() => {
    if (!active) return;
    primaryFabCount += 1;
    emit();
    return () => {
      primaryFabCount -= 1;
      emit();
    };
  }, [active]);
}

/** True while some screen owns the floating-action corner. */
export function useHasPrimaryFloatingAction(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => primaryFabCount > 0,
    () => false
  );
}
