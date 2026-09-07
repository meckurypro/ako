// src/components/MessageStatusTicks.tsx
import { Check, CheckCheck } from "lucide-react";

interface MessageStatusTicksProps {
  deliveredAt: string | null;
  readAt: string | null;
  /**
   * "bubble" — sitting on the accent-green sent bubble in the thread view.
   * "list"   — sitting on the plain canvas background in the conversation list.
   * Only affects the un-read (sent/delivered) color; read is always tick-read.
   */
  variant?: "bubble" | "list";
  size?: number;
}

/**
 * Sent/delivered/read indicator — only render where the CURRENT USER
 * is the sender (never on the other participant's messages).
 *   - read_at set      -> double check, neon "tick-read" orange (--color-tick-read)
 *   - delivered_at set -> double check, unread color for the variant
 *   - neither          -> single check, unread color for the variant
 *
 * Read is intentionally NOT the accent green — the sent bubble itself
 * is already accent-colored, so an accent tick disappears into it.
 * tick-read is a separate, deliberately loud color chosen to stay
 * legible against both the green bubble and the canvas list background.
 *
 * The bubble variant's unread color is a fixed white tone rather than
 * `text-canvas` — canvas flips to near-black in dark mode, which made
 * ticks (and the sender's message text, fixed the same way) nearly
 * invisible on the green bubble there.
 */
export function MessageStatusTicks({ deliveredAt, readAt, variant = "bubble", size = 15 }: MessageStatusTicksProps) {
  const unreadColor = variant === "bubble" ? "text-white/80" : "text-ink-muted";

  if (readAt) {
    return <CheckCheck size={size} className="text-tick-read" aria-label="Read" />;
  }
  if (deliveredAt) {
    return <CheckCheck size={size} className={unreadColor} aria-label="Delivered" />;
  }
  return <Check size={size} className={unreadColor} aria-label="Sent" />;
}
