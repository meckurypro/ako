// src/components/PresenceDot.tsx
import { getPresenceStatus } from "../lib/presence";

const DOT_STYLES = {
  online: "bg-[var(--color-presence-online)] shadow-[0_0_6px_var(--color-presence-online)]",
  recent: "bg-[var(--color-tick-read)] shadow-[0_0_6px_var(--color-tick-read)]",
  offline: "bg-ink-muted/30",
} as const;

export function PresenceDot({
  lastSeenAt,
  className = "",
}: {
  lastSeenAt: string | null | undefined;
  className?: string;
}) {
  const status = getPresenceStatus(lastSeenAt);
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${DOT_STYLES[status]} ${className}`} aria-hidden="true" />;
}
