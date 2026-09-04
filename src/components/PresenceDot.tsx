// src/components/PresenceDot.tsx
import { getPresenceStatus } from "../lib/presence";

const DOT_STYLES = {
  online: "bg-[var(--color-presence-online)] shadow-[0_0_6px_var(--color-presence-online)]",
  recent: "bg-[var(--color-tick-read)] shadow-[0_0_6px_var(--color-tick-read)]",
  offline: "bg-ink-muted/30",
} as const;

export function PresenceDot({
  lastSeenAt,
  size = 11,
  className = "",
}: {
  lastSeenAt: string | null | undefined;
  /** Diameter in px. Default bumped up from the old fixed 8px now that
   *  this only lives in the DM header (see MessageThread.tsx) — it no
   *  longer has to compete for space in the chat list row. */
  size?: number;
  className?: string;
}) {
  const status = getPresenceStatus(lastSeenAt);
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${DOT_STYLES[status]} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
