// src/hooks/useLiveAudioLevels.ts
import { useEffect, type MutableRefObject } from "react";
import type { RecorderLiveStore } from "../lib/recorderLiveStore";

export const LIVE_BAR_COUNT = 40;
export const IDLE_LEVELS: number[] = Array(LIVE_BAR_COUNT).fill(0.08);
/** One new bar every ~55 ms (≈18 fps) — plenty for a scrolling meter, a third of the old per-frame cost. */
const SAMPLE_INTERVAL_MS = 55;

/**
 * Live, talking-level waveform bars for the in-progress recording bar — WhatsApp's mic view fills in
 * bars as you speak. Samples the mic stream's amplitude with an AnalyserNode and pushes a rolling
 * window of recent readings into the recorder's live store (NOT React state — see recorderLiveStore.ts),
 * so bars scroll in from the right as you talk without re-rendering the chat screen.
 * Sampling freezes while the recording is paused.
 */
export function useLiveAudioLevels(
  stream: MediaStream | null,
  live: RecorderLiveStore,
  pausedRef: MutableRefObject<boolean>
) {
  useEffect(() => {
    if (!stream) {
      live.set({ levels: IDLE_LEVELS });
      return;
    }

    const AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioContextCtor();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    let raf = 0;
    let last = 0;
    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      if (pausedRef.current || now - last < SAMPLE_INTERVAL_MS) return;
      last = now;
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const centered = (data[i] - 128) / 128;
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      // Raw mic RMS reads very quiet at typical speaking volume — scaled up so ordinary speech fills the bars.
      const level = Math.max(0.08, Math.min(1, rms * 4));
      live.set({ levels: [...live.get().levels.slice(1), level] });
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      audioCtx.close().catch(() => {});
    };
  }, [stream, live, pausedRef]);
}
