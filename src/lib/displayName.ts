/** Returns display_name if set, falls back to @username. */
export function displayName(profile: {
  display_name?: string | null;
  username: string;
}): string {
  return profile.display_name?.trim() || profile.username;
}

/** Truncated version for compact UI slots (avatars, cards, etc.). */
export function shortDisplayName(
  profile: { display_name?: string | null; username: string },
  maxLength = 20
): string {
  const name = displayName(profile);
  return name.length > maxLength ? name.slice(0, maxLength).trimEnd() + "…" : name;
}
