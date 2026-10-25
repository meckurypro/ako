// supabase/functions/run-post-automation/look.ts
//
// How an automated post looks in the app. The app already knows eight named heading colors (posts.heading_color,
// src/lib/headingColors.ts), so the engine only has to pick one of those keys. Automated posts take a color from the
// day of the week in the account's own timezone, so a feed shows a different heading color on each day.
// Graphite is left out on purpose: it is the neutral choice and reads as "no color".

// Index 0 is Sunday, matching the schedule format.
export const WEEKDAY_HEADING_COLORS = [
  "espresso", // Sunday
  "sapphire", // Monday
  "emerald", // Tuesday
  "amber", // Wednesday
  "garnet", // Thursday
  "amethyst", // Friday
  "petrol", // Saturday
] as const;

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function headingColorFor(timezone: string, at: Date = new Date()): string {
  let day = at.getUTCDay();
  try {
    const name = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(at);
    const found = SHORT_DAYS.indexOf(name);
    if (found >= 0) day = found;
  } catch {
    // An unknown timezone can't happen (the database checks it), but never let a color stop a post.
  }
  return WEEKDAY_HEADING_COLORS[day];
}
