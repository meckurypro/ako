// src/hooks/useSound.tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MINIMALIST_EVENTS, SOUND_REGISTRY, type SoundEvent } from "../lib/sounds";
import { duckAudioBus, getAudioBus, resumeAudioBus, unduckAudioBus } from "../lib/audioBus";

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
 * Wraps the app (see main.tsx). Every sound plays through the shared audio
 * bus (see lib/audioBus.ts) rather than owning its own <audio> element, so
 * one master gain can duck UI sounds under real media — a voice note, a
 * post's video, a live Room/Meeting call — instead of talking over it.
 *
 * Ducking is media-driven, not feature-driven: a single capture-phase
 * listener on document's play/pause/ended events catches every <audio>/
 * <video> in the app (voice notes, post media, LiveKit's call audio all
 * render real media elements — see MediaPreviewPlayer, VoiceMessageBubble,
 * MeetingRoom), so nothing per-feature needs to know ducking exists.
 *
 * Swapping a placeholder for a real designed sound never touches this file
 * — just replace the file in public/sounds/ under the same name (see
 * src/lib/sounds.ts for the registry).
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(readStoredEnabled);
  const [mode, setModeState] = useState<SoundMode>(readStoredMode);
  const bufferCache = useRef<Partial<Record<SoundEvent, Promise<AudioBuffer>>>>({});

  function setEnabled(next: boolean) {
    localStorage.setItem(ENABLED_KEY, String(next));
    setEnabledState(next);
  }

  function setMode(next: SoundMode) {
    localStorage.setItem(MODE_KEY, next);
    setModeState(next);
  }

  // Duck (don't mute) while any real media element in the app is playing.
  // A count rather than a boolean because e.g. two voice notes can't both
  // play at once in this app today, but a video with sound plus a live
  // Room call in another tab-like surface isn't impossible — the bus
  // should only un-duck once every real source has stopped.
  useEffect(() => {
    let activeMediaCount = 0;

    function isRealMedia(target: EventTarget | null): target is HTMLMediaElement {
      return target instanceof HTMLMediaElement;
    }

    function handlePlay(e: Event) {
      if (!isRealMedia(e.target)) return;
      activeMediaCount += 1;
      if (activeMediaCount === 1) duckAudioBus();
    }

    function handleStop(e: Event) {
      if (!isRealMedia(e.target)) return;
      activeMediaCount = Math.max(0, activeMediaCount - 1);
      if (activeMediaCount === 0) unduckAudioBus();
    }

    // capture: true — play/pause/ended don't bubble, so this has to
    // intercept them on the way down instead of listening at the target.
    document.addEventListener("play", handlePlay, true);
    document.addEventListener("pause", handleStop, true);
    document.addEventListener("ended", handleStop, true);
    return () => {
      document.removeEventListener("play", handlePlay, true);
      document.removeEventListener("pause", handleStop, true);
      document.removeEventListener("ended", handleStop, true);
    };
  }, []);

  const play = useCallback(
    (event: SoundEvent) => {
      if (!enabled) return;
      if (mode === "minimalist" && !MINIMALIST_EVENTS.has(event)) return;

      const def = SOUND_REGISTRY[event];
      if (!def) return;

      const { context, gain } = getAudioBus();
      resumeAudioBus(); // this call is itself a user-gesture handler, so this is safe

      let bufferPromise = bufferCache.current[event];
      if (!bufferPromise) {
        bufferPromise = fetch(def.file)
          .then((res) => res.arrayBuffer())
          .then((data) => context.decodeAudioData(data));
        bufferCache.current[event] = bufferPromise;
      }

      bufferPromise
        .then((buffer) => {
          const source = context.createBufferSource();
          source.buffer = buffer;
          source.connect(gain);
          source.start(0);
        })
        .catch(() => {
          // Fetch/decode failure, or autoplay still blocked before any
          // gesture has landed — safe to ignore, matches the old
          // HTMLAudioElement behavior of silently skipping a blocked play.
          bufferCache.current[event] = undefined;
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
