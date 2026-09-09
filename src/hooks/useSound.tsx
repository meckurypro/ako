// src/hooks/useSound.tsx
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { MINIMALIST_EVENTS, SOUND_REGISTRY, type SoundEvent } from "../lib/sounds";

export type SoundMode = "minimalist" | "normal";

const ENABLED_KEY = "ako-sound-enabled";
const MODE_KEY = "ako-sound-mode";

function readStoredEnabled(): boolean {
  const stored = localStorage.getItem(ENABLED_KEY);
  return stored !== "false"; // on by default
}

function readStoredMode(): SoundMode {
  const stored = localStorage.getItem(MODE_KEY);
  return stored === "minimalist" ? "minimalist" : "normal";
}

interface SoundContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  mode: SoundMode;
  setMode: (mode: SoundMode) => void;
  /** Play a registered sound event, respecting the current on/off + mode settings. */
  play: (event: SoundEvent) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

/**
 * Wraps the app (see main.tsx). Lazily creates and caches one HTMLAudioElement
 * per event on first play, so nothing loads until it's actually needed.
 *
 * Swapping a placeholder for a real designed sound never touches this file —
 * just replace the file in public/sounds/ under the same name (see
 * src/lib/sounds.ts for the registry).
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(readStoredEnabled);
  const [mode, setModeState] = useState<SoundMode>(readStoredMode);
  const cache = useRef<Partial<Record<SoundEvent, HTMLAudioElement>>>({});

  function setEnabled(next: boolean) {
    localStorage.setItem(ENABLED_KEY, String(next));
    setEnabledState(next);
  }

  function setMode(next: SoundMode) {
    localStorage.setItem(MODE_KEY, next);
    setModeState(next);
  }

  const play = useCallback(
    (event: SoundEvent) => {
      if (!enabled) return;
      if (mode === "minimalist" && !MINIMALIST_EVENTS.has(event)) return;

      const def = SOUND_REGISTRY[event];
      if (!def) return;

      let audio = cache.current[event];
      if (!audio) {
        audio = new Audio(def.file);
        audio.preload = "auto";
        cache.current[event] = audio;
      }

      // Restart from the top if it's still playing from a rapid repeat
      // (e.g. double-tapping like) rather than queuing or ignoring it.
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // Autoplay can be blocked before the user's first interaction with
        // the page — safe to ignore, the next user-initiated play will work.
      });
    },
    [enabled, mode],
  );

  const value = useMemo(() => ({ enabled, setEnabled, mode, setMode, play }), [enabled, mode, play]);

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used within SoundProvider");
  return ctx;
}
