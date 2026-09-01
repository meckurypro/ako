/** Returns display_name if set, falls back to @username. */
export function displayName(profile: {
  display_name?: string | null;
  username: string;
}): string {
  return profile.display_name?.trim() || profile.username;
}
