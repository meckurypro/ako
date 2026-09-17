// src/components/VerifiedBadge.tsx
//
// The Admin-assigned identity badge (see AKỌ — ADMIN VERIFIED BADGE
// ASSIGNMENT & BULK VERIFICATION SYSTEM). Independent of account
// approval, KYC, and founding-user status — this component only ever
// reflects profiles.is_verified, which is written exclusively via
// admin_set_verified/admin_bulk_set_verified.
//
// Styled as a solid gradient disc with a white checkmark (Twitter/Meta-
// style) rather than a flat outline icon — reads as a deliberate,
// premium mark rather than just another muted-accent chip sitting next
// to the tier badge. The gradient runs off the existing accent tokens
// (not a new hardcoded color) so it still tracks light/dark theming,
// with a soft matching glow behind it for a bit of lift on the card.
import { Check } from "lucide-react";

function BadgeIcon({ size, className = "" }: { size: number; className?: string }) {
  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, var(--color-accent-hover), var(--color-accent))",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.25) inset, 0 1px 3px rgba(var(--accent-rgb), 0.55)",
      }}
    >
      <Check size={Math.round(size * 0.62)} strokeWidth={3.25} className="text-white" />
    </span>
  );
}

export function VerifiedBadge({
  size = 15,
  className = "",
  label = false,
}: {
  size?: number;
  className?: string;
  // Spells the mark out as a "Verified" pill instead of the bare icon —
  // used on ProfilePage/PagePage where there's room for it to be
  // prominent, rather than the compact icon-only mark PostCard uses.
  label?: boolean;
}) {
  if (!label) {
    return (
      <span aria-label="Verified" role="img">
        <BadgeIcon size={size} className={className} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-accent-soft pl-1 pr-2.5 py-1 ${className}`}
      aria-label="Verified"
      role="img"
    >
      <BadgeIcon size={size} />
      <span className="text-[13px] font-semibold text-accent">Verified</span>
    </span>
  );
}
