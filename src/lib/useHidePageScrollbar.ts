// src/lib/useHidePageScrollbar.ts
//
// Hides the PAGE's own scrollbar (<html>) while a screen is mounted. Inner scroll containers never show bars (see
// index.css), but the page itself keeps the platform scrollbar — and on a screen whose height changes a lot between
// tabs (the profile: a long Posts tab vs a short Files tab) that bar kept popping in and out, shifting the layout and
// reading as a glitch. The page still scrolls exactly as before; only the bar is hidden, and only on screens that ask.
import { useEffect } from "react";

export function useHidePageScrollbar() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("no-scrollbar");
    return () => root.classList.remove("no-scrollbar");
  }, []);
}
