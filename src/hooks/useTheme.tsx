// src/hooks/useTheme.tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeSetting = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "ako-theme";

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(setting: ThemeSetting): ResolvedTheme {
  return setting === "system" ? (systemPrefersDark() ? "dark" : "light") : setting;
}

function readStoredSetting(): ThemeSetting {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function applyResolvedTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

interface ThemeContextValue {
  /** What the user picked — light / dark / follow the OS setting. */
  theme: ThemeSetting;
  /** What's actually applied right now (system resolved to light or dark). */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeSetting) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Wraps the app (see main.tsx). The actual .dark class on <html> is
 * also set synchronously by an inline script in index.html before
 * React ever mounts, so there's no flash of the wrong theme on load —
 * this provider just takes over from there and keeps it in sync with
 * user choice + OS changes for the rest of the session.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeSetting>(readStoredSetting);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolve(theme));

  function setTheme(next: ThemeSetting) {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
    const resolvedNext = resolve(next);
    setResolvedTheme(resolvedNext);
    applyResolvedTheme(resolvedNext);
  }

  // Keep in sync with OS-level changes while "system" is selected —
  // e.g. the device switches to dark mode at sunset.
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    function handleChange() {
      const resolvedNext = resolve("system");
      setResolvedTheme(resolvedNext);
      applyResolvedTheme(resolvedNext);
    }
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [theme]);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
