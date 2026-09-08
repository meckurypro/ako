// src/lib/voiceNotes.ts

const VOICE_NOTE_MARKER = "ako-voice-note:v1:";

export interface VoiceNotePayload {
  url: string;
  durationSec: number;
  /** Waveform bar heights (0..1), computed client-side at record time.
   *  Optional so older, already-sent voice notes without this field
   *  still decode fine — the bubble falls back to fetching and
   *  decoding the audio itself when it's missing. */
  peaks?: number[];
}

/**
 * Packs a voice note's storage URL + duration into a plain message
 * `content` string, so voice notes can ride the existing text-only
 * `messages.content` column without a schema change. Every other
 * message-content consumer in the app (search, reply snippets,
 * conversation-list previews) just sees an opaque string it doesn't
 * match against this marker, so nothing else needs to change to stay
 * backward compatible.
 */
export function encodeVoiceNote(payload: VoiceNotePayload): string {
  return `${VOICE_NOTE_MARKER}${JSON.stringify(payload)}`;
}

/** Returns the decoded payload, or null for an ordinary text message. */
export function decodeVoiceNote(content: string): VoiceNotePayload | null {
  if (!content || !content.startsWith(VOICE_NOTE_MARKER)) return null;
  try {
    const parsed = JSON.parse(content.slice(VOICE_NOTE_MARKER.length));
    if (parsed && typeof parsed.url === "string" && typeof parsed.durationSec === "number") {
      const peaks =
        Array.isArray(parsed.peaks) && parsed.peaks.every((p: unknown) => typeof p === "number")
          ? parsed.peaks
          : undefined;
      return { url: parsed.url, durationSec: parsed.durationSec, peaks };
    }
    return null;
  } catch {
    return null;
  }
}

/** Plain-text stand-in for a voice note wherever raw text is expected
 *  (reply-to quote snippets, search matching, forwarding preview). */
export const VOICE_NOTE_LABEL = "🎤 Voice message";

/** mm:ss formatting shared by the recorder UI and playback bubble. */
export function formatVoiceDuration(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
