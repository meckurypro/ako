// src/lib/justPosted.ts
//
// Hand-off between Compose and Feed for "pin the post I just made at
// the top of For You". Compose now returns to the page it was opened
// from with ordinary back navigation (so history stays tidy), which
// can't carry router state — hence this one-shot, in-memory slot.
// Feed reads it once on mount via consumeJustPosted().
//
// Compose redirects to the Feed the instant "Post" is tapped, before the
// server has answered, so it can only hand over a PENDING result: a promise
// for the new post's id (null if posting failed, in which case Compose puts
// the person back on the editor). Feed reads it via consumeJustPostedPending().

let pendingId: string | null = null;
let pendingResult: Promise<string | null> | null = null;

export function setJustPosted(id: string | null) {
  pendingId = id;
}

export function consumeJustPosted(): string | null {
  const id = pendingId;
  pendingId = null;
  return id;
}

export function setJustPostedPending(result: Promise<string | null> | null) {
  pendingResult = result;
}

export function consumeJustPostedPending(): Promise<string | null> | null {
  const result = pendingResult;
  pendingResult = null;
  return result;
}
