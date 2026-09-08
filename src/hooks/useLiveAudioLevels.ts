// src/hooks/useLiveAudioLevels.ts
import { useEffect, useRef, useState } from "react";

const BAR_COUNT = 40;
const IDLE_LEVELS = Array(BAR_COUNT).fill(0.08);

/**
 * Live, talking-level waveform bars for the in-progress recording bar
 * — WhatsApp's mic view fills in bars as you speak rather than just
 * showing a pulsing dot. Samples the mic stream's amplitude every
 * frame via an AnalyserNode and keeps a rolling window of the most
 * recent readings, so bars scroll in from the right as you talk, the
 * same as the native app's live meter.
 */
export function useLiveAudioLevels(stream: MediaStream | null): number[] {
  const [levels, setLevels] = useState<number[]>(IDLE_LEVELS);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) {
      setLevels(IDLE_LEVELS);
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

    function tick() {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const centered = (data[i] - 128) / 128;
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      // Raw mic RMS reads very quiet at typical speaking volume —
      // scaled up so ordinary speech actually fills the bars.
      const level = Math.max(0.08, Math.min(1, rms * 4));
      setLevels((prev) => [...prev.slice(1), level]);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      source.disconnect();
      audioCtx.close().catch(() => {});
    };
  }, [stream]);

  return levels;
}
