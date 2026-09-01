// src/components/MessageStatusTicks.tsx
import { Check, CheckCheck } from "lucide-react";

interface MessageStatusTicksProps {
  deliveredAt: string | null;
  readAt: string | null;
}

/**
 * Sent/delivered/read indicator — only render on message bubbles the
 * CURRENT USER sent (never on the other participant's messages).
 *   - read_at set      -> double check, accent (sage) colored
 *   - delivered_at set  -> double check, muted grey
 *   - neither            -> single check, muted grey (sent only)
 */
export function MessageStatusTicks({ deliveredAt, readAt }: MessageStatusTicksProps) {
  if (readAt) {
    return <CheckCheck size={15} className="text-accent" aria-label="Read" />;
  }
  if (deliveredAt) {
    return <CheckCheck size={15} className="text-ink-muted" aria-label="Delivered" />;
  }
  return <Check size={15} className="text-ink-muted" aria-label="Sent" />;
}
