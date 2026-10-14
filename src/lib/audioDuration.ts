// src/lib/audioDuration.ts
//
// Browser-recorded voice notes (MediaRecorder → WebM/Opus) carry no duration in their header, so an
// <audio> element reports `duration === Infinity` and seeking is unreliable — which silently broke the
// progress fill and scrubbing on notes recorded in this app. Two fixes, used together:
//   • resolveInfiniteDuration: the standard trick — seek far past the end so the browser scans the file and
//     learns the real length, then jump back to 0.
//   • durationOf: until (or unless) that resolves, fall back to the duration we recorded ourselves.

export function durationOf(audio: HTMLAudioElement | null, fallbackSec: number): number {
  if (audio && Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration;
  return fallbackSec;
}

export function resolveInfiniteDuration(audio: HTMLAudioElement, onDone: () => void): void {
  if (audio.duration !== Infinity) {
    onDone();
    return;
  }
  const finish = () => {
    audio.removeEventListener("timeupdate", finish);
    audio.currentTime = 0;
    onDone();
  };
  audio.addEventListener("timeupdate", finish);
  audio.currentTime = 1e101;
}
