// src/lib/audioBus.ts
//
// One shared AudioContext + master GainNode that every UI sound effect
// plays through, instead of each sound owning its own <audio> element.
// Two things this buys over plain HTMLAudioElement playback:
//
//  1. Ducking: volume can be ramped smoothly (no click/pop, unlike setting
//     .volume directly) whenever real media — a voice note, a post's video,
//     a live Room/Meeting call — is playing, so a "like" chime never talks
//     over someone's voice note.
//  2. Overlapping playback for free: a rapid double-tap (e.g. liking twice
//     fast) creates a new AudioBufferSourceNode per play() call rather than
//     racing to reset one shared element's currentTime.
//
// The context is created lazily (not at module load) because browsers
// require it to start from a user gesture — see resumeAudioBus().

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;

const NORMAL_GAIN = 1.0;
const DUCKED_GAIN = 0.35;
const RAMP_SECONDS = 0.2;

function ensureBus(): { context: AudioContext; gain: GainNode } {
  if (!audioContext || !masterGain) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new Ctor();
    masterGain = audioContext.createGain();
    masterGain.gain.value = NORMAL_GAIN;
    masterGain.connect(audioContext.destination);
  }
  return { context: audioContext, gain: masterGain };
}

export function getAudioBus(): { context: AudioContext; gain: GainNode } {
  return ensureBus();
}

/** Call from a user-gesture-triggered handler (a play() call qualifies) —
 *  a fresh AudioContext starts "suspended" until one happens. */
export function resumeAudioBus(): void {
  const { context } = ensureBus();
  if (context.state === "suspended") void context.resume();
}

function rampTo(target: number) {
  const { context, gain } = ensureBus();
  const now = context.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(target, now + RAMP_SECONDS);
}

export function duckAudioBus(): void {
  rampTo(DUCKED_GAIN);
}

export function unduckAudioBus(): void {
  rampTo(NORMAL_GAIN);
}
