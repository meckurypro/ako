import type { Tier } from "../types/database";

const TIER_LABELS: Record<Tier, string | null> = {
  newcomer: null,       // no badge for the default tier — avoid visual noise
  contributor: "Contributor",
  publisher: "Publisher",
  host: "Host",
  creator_business: "Creator",
};

export function TierBadge({ tier }: { tier: Tier }) {
  const label = TIER_LABELS[tier];
  if (!label) return null;

  return (
    <span className="text-xs font-medium text-accent bg-accent-soft px-2 py-0.5 rounded-full">
      {label}
    </span>
  );
}
