// src/components/VerifiedBadge.tsx
//
// The Admin-assigned identity badge (see AKỌ — ADMIN VERIFIED BADGE
// ASSIGNMENT & BULK VERIFICATION SYSTEM). Independent of account
// approval, KYC, and founding-user status — this component only ever
// reflects profiles.is_verified, which is written exclusively via
// admin_set_verified/admin_bulk_set_verified.
//
// Placeholder icon (lucide's BadgeCheck) pending an entry in Akọ's
// own custom icon system (see 08.8_AKO_ICONS_CREATION.md) — swap the
// icon here and every call site updates automatically, which is the
// point of centralizing this rather than inlining an icon per screen.
import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <BadgeCheck
      size={size}
      className={`text-accent fill-accent-soft flex-shrink-0 ${className}`}
      aria-label="Verified"
      role="img"
    />
  );
}
