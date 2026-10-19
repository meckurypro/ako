// src/hooks/useDismissKeyboard.ts
// Opening a menu / option sheet should hide the on-screen keyboard so the options aren't crowded by it. Only on
// touch devices (where a soft keyboard exists) — on desktop, losing focus from a text box for a menu would just
// be annoying.
import { useEffect } from "react";

export function dismissKeyboard() {
  if (typeof window === "undefined" || !window.matchMedia?.("(pointer: coarse)").matches) return;
  const el = document.activeElement as HTMLElement | null;
  if (el && el !== document.body && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) el.blur();
}

/** Call at the top of a menu / option-sheet component: hides the soft keyboard when it opens. */
export function useDismissKeyboardOnMount() {
  useEffect(() => {
    dismissKeyboard();
  }, []);
}
