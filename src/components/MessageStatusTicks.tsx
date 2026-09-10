// src/components/MessageStatusTicks.tsx
import { Check, CheckCheck } from "lucide-react";

interface MessageStatusTicksProps {
  deliveredAt: string | null;
  readAt: string | null;
  /**
   * "bubble" — sitting on the accent-green sent bubble in the thread view.
   * "list"   — sitting on the plain canvas background in the conversation list.
   * Only affects the un-read (sent/delivered) color; read is always tick-blue.
   */
  variant?: "bubble" | "list";
  size?: number;
}

/**
 * Sent/delivered/read indicator — only render where the CURRENT USER
 * is the sender (never on the other participant's messages).
 *   - read_at set      -> double check, WhatsApp blue (--color-tick-blue)
 *   - delivered_at set -> double check, unread color for the variant
 *   - neither          -> single check, unread color for the variant
 *
 * Read uses WhatsApp's own blue (#53BDEB) rather than the app's accent
 * green — the sent bubble itself is already accent-colored, so a green
 * tick would disappear into it, and the ask here was specifically to
 * match WhatsApp's real color codes rather than reuse an in-app color.
 * Slightly larger than the old default (18 vs 15) and a touch thinner
 * (strokeWidth 1.75 vs lucide's default 2) — closer to WhatsApp's own
 * longer, slimmer check glyph than the stockier default icon reads as.
 *
 * The bubble variant's unread color is a fixed white tone rather than
 * `text-canvas` — canvas flips to near-black in dark mode, which made
 * ticks (and the sender's message text, fixed the same way) nearly
 * invisible on the green bubble there.
 */
export function MessageStatusTicks({ deliveredAt, readAt, variant = "bubble", size = 18 }: MessageStatusTicksProps) {
  const unreadColor = variant === "bubble" ? "text-white/80" : "text-ink-muted";

  if (readAt) {
    return <CheckCheck size={size} strokeWidth={1.75} className="text-tick-blue" aria-label="Read" />;
  }
  if (deliveredAt) {
    return <CheckCheck size={size} strokeWidth={1.75} className={unreadColor} aria-label="Delivered" />;
  }
  return <Check size={size} strokeWidth={1.75} className={unreadColor} aria-label="Sent" />;
}
