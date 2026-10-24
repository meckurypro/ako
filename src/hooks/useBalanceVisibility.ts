// src/hooks/useBalanceVisibility.ts
//
// The eye on the Wallet's balance card. The choice sticks until the person changes it again: it's kept on this
// device (localStorage), per account — so switching accounts on a shared phone doesn't carry one person's
// "hidden" onto another — and every open tab / component stays in step.
import { useCallback, useSyncExternalStore } from "react";
import { useAuth } from "./useAuth";

const KEY_PREFIX = "ako:wallet:balance-hidden";
const listeners = new Set<() => void>();
// Used only when storage is blocked (private mode, etc.): the toggle still works for this session.
const memory = new Map<string, boolean>();

function read(key: string): boolean {
  const remembered = memory.get(key);
  if (remembered !== undefined) return remembered;
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function useBalanceVisibility() {
  const { user } = useAuth();
  const key = `${KEY_PREFIX}:${user?.id ?? "anon"}`;

  const subscribe = useCallback(
    (notify: () => void) => {
      listeners.add(notify);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) notify();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(notify);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key]
  );

  const hidden = useSyncExternalStore(subscribe, () => read(key), () => false);

  const setHidden = useCallback(
    (next: boolean) => {
      memory.set(key, next);
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        /* not persisted across visits, but still applies for this session */
      }
      listeners.forEach((notify) => notify());
    },
    [key]
  );

  const toggle = useCallback(() => setHidden(!read(key)), [key, setHidden]);

  return { hidden, toggle, setHidden };
}
