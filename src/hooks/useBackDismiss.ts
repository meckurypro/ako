// src/hooks/useBackDismiss.ts
import { useEffect, useRef } from "react";

let idCounter = 0;

/**
 * Makes the mobile back gesture / browser back button close an
 * overlay — bottom sheet, modal, lightbox, action menu, or a single
 * step within one — instead of "teleporting" out of the page
 * underneath it. Call this once, unconditionally, from inside an
 * overlay component that only ever gets mounted while it's open (the
 * existing pattern throughout this app: `{showThing && <Thing
 * onClose={...} />}`).
 *
 * On mount: pushes one extra history entry at the *same* URL (tagged
 * with a unique id), so no route actually changes and no page
 * transition happens.
 * On back (hardware button, swipe gesture, or browser back): that
 * pushState entry is what gets popped, so `popstate` fires instead of
 * the browser leaving the real page. Every currently-mounted instance
 * of this hook receives that same global event, so each one checks
 * whether ITS OWN id is still the current history state afterward —
 * if so, something nested on top of it (a later step, a picker opened
 * from within this sheet) was the one popped, and this instance stays
 * open; only the instance whose id is no longer current calls its own
 * `onClose`. This is what makes a two-step overlay work correctly —
 * see ReshareSheet's choose→quote steps, where back from "quote"
 * should return to "choose" rather than closing the whole sheet.
 * On any other close path (X button, backdrop tap, an action
 * completing, an outer state change unmounting it): the cleanup below
 * pops that same dummy entry itself, so it never lingers as an extra,
 * invisible "step back" the next time the user actually presses back.
 * This just unconditionally calls `history.back()` once per
 * not-yet-consumed instance — it does NOT re-check whether its id is
 * still the current history state first, because when several nested
 * levels close in the same synchronous batch (e.g. tapping Cancel
 * inside ReshareSheet's quote step unmounts both the quote step and
 * the sheet itself at once), only the first level's `history.back()`
 * has actually applied by the time the second level's cleanup runs —
 * gating on "current state" there would wrongly conclude the second
 * entry was already gone and skip popping it, leaking an orphaned
 * entry. React cleans up effects in reverse mount order (innermost
 * first), which matches push order exactly, so calling `history.back()`
 * once per level, unconditionally, pops the right number of entries
 * in the right order regardless of how many levels close at once.
 *
 * Pass `enabled = false` for a component that renders in more than one
 * mode and is only a real overlay/step in some of them (e.g. an emoji
 * picker that's a full-screen sheet in one mode but inline content in
 * another, or a sub-step that's only active part of the time) — hooks
 * can't be called conditionally, but the history push/pop can be
 * skipped so the inactive mode never touches browser history at all.
 */
export function useBackDismiss(onClose: () => void, enabled: boolean = true) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    const id = ++idCounter;
    let consumed = false;
    window.history.pushState({ akoOverlay: id }, "");

    const handlePopState = () => {
      if (consumed) return;
      // Our id is still current → something nested above us just
      // closed instead, revealing us. Stay open.
      if ((window.history.state as { akoOverlay?: number } | null)?.akoOverlay === id) return;
      consumed = true;
      onCloseRef.current();
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (!consumed) {
        consumed = true;
        window.history.back();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
