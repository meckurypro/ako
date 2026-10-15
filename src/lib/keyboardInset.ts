// src/lib/keyboardInset.ts
// Publishes the on-screen keyboard's height as a CSS variable so bottom-anchored overlays (comment sheet, composers,
// pickers, dialogs with inputs) can sit above it instead of being buried underneath.
//
//   --kb-inset            keyboard height in px (0 when closed)
//   html[data-kb-open]    set while the keyboard is up
//
// Why this is needed: iOS Safari never resizes the layout viewport for the keyboard — it just overlays it — so a
// `position: fixed; inset: 0` sheet keeps its full height and its bottom (where the text box is) ends up under the
// keyboard. Chrome/Firefox on Android honour `interactive-widget=resizes-content` (see index.html) and resize the
// layout viewport themselves; there window.innerHeight shrinks together with the visual viewport, the difference
// below stays ~0, and this publishes nothing — so the two mechanisms never double-count.
//
// Overlays opt in with the `ako-keyboard-aware` class (see index.css). The chat composer uses useKeyboardInset
// directly because it also animates against the emoji tray.

let started = false;

export function startKeyboardInsetTracking(): void {
  if (started || typeof window === "undefined") return;
  const vv = window.visualViewport;
  if (!vv) return;
  started = true;

  const root = document.documentElement;
  let frame = 0;

  const update = () => {
    frame = 0;
    const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    // Under ~100px is the browser's own chrome (address bar) moving, not a keyboard.
    const open = inset > 100;
    root.style.setProperty("--kb-inset", open ? `${inset}px` : "0px");
    if (open) root.setAttribute("data-kb-open", "");
    else root.removeAttribute("data-kb-open");
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  vv.addEventListener("resize", schedule);
  vv.addEventListener("scroll", schedule);
  window.addEventListener("orientationchange", schedule);
  update();
}
