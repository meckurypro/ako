// src/lib/justPosted.ts
//
// Hand-off between Compose and Feed for "pin the post I just made at
// the top of For You". Compose now returns to the page it was opened
// from with ordinary back navigation (so history stays tidy), which
// can't carry router state — hence this one-shot, in-memory slot.
// Feed reads it once on mount via consumeJustPosted().

let pendingId: string | null = null;

export function setJustPosted(id: string | null) {
  pendingId = id;
}

export function consumeJustPosted(): string | null {
  const id = pendingId;
  pendingId = null;
  return id;
}
