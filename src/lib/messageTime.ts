// src/lib/messageTime.ts

/**
 * WhatsApp shows a bare "h:mm" (12- or 24-hour, following the device's
 * own locale/settings rather than forcing one format) inside every
 * message bubble — no seconds, no date. Mirrors the same
 * `toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })`
 * pattern this codebase already uses for "Last seen" (see
 * lib/presence.ts) so both surfaces read consistently.
 */
export function formatMessageTime(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
