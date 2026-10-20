// src/components/BadgeStreakNote.tsx
//
// The posting-streak rule behind the Verified badge, shown to the account
// owner on their own profile only. Verified status itself is permanent
// (admin-assigned); the badge only SHOWS while the owner has posted at least
// once in each of the last four 7-day windows. `streak` is profiles.badge_streak
// (0–4, owner-only; null for admins and unverified accounts, which render nothing).
export function BadgeStreakNote({ visible, streak }: { visible: boolean; streak: number }) {
  const copy = visible
    ? "Post at least once every week to keep your badge."
    : "Badge hidden. Post every week for 4 weeks to bring it back.";

  return (
    <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-muted" role="note">
      <span className="flex gap-1 flex-shrink-0" role="img" aria-label={`${streak} of 4 weeks`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 w-4 rounded-full ${i < streak ? "bg-accent" : "bg-border"}`} />
        ))}
      </span>
      <span>{copy}</span>
    </div>
  );
}
