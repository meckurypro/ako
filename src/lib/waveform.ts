// src/lib/waveform.ts

/**
 * Decodes a recorded audio blob and reduces it to a fixed number of
 * peak-amplitude bars — the "waveform" look WhatsApp uses for both
 * the pre-send preview and the sent bubble, instead of a plain
 * progress line. Each bar is the loudest sample in its time slice,
 * across channels, normalized 0..1 with a small floor so quiet
 * stretches still render as a visible sliver instead of vanishing.
 */
export async function computeWaveformPeaks(blob: Blob, barCount = 40): Promise<number[]> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioContextCtor =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextCtor();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const { numberOfChannels: channels, length } = audioBuffer;
    const samplesPerBar = Math.max(1, Math.floor(length / barCount));
    const peaks: number[] = [];

    for (let bar = 0; bar < barCount; bar++) {
      const start = bar * samplesPerBar;
      const end = Math.min(length, start + samplesPerBar);
      let peak = 0;
      for (let ch = 0; ch < channels; ch++) {
        const data = audioBuffer.getChannelData(ch);
        // Stride through the slice rather than reading every sample —
        // plenty accurate for a bar-level peak and much cheaper on a
        // multi-minute note.
        for (let i = start; i < end; i += 4) {
          const v = Math.abs(data[i]);
          if (v > peak) peak = v;
        }
      }
      peaks.push(peak);
    }

    const max = Math.max(...peaks, 0.0001);
    return peaks.map((p) => Math.max(0.12, Math.min(1, p / max)));
  } finally {
    audioCtx.close().catch(() => {});
  }
}
