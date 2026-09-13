# Event ticketing — what's real, what's stubbed, and why

## The honest boundary

Issuing a ticket has to happen at the exact moment a payment is
confirmed, inside the same transaction that records the purchase —
otherwise you risk selling more tickets than exist, or issuing a
ticket for a payment that never actually completed. That logic lives
in the `purchase-project` edge function, which isn't in this repo
(same boundary as every other payment-adjacent piece in this app).
So ticket *issuance* is a backend change you still need to make.

Everything else — rendering the QR code, scanning it at the door,
marking a ticket checked in, and the post-event highlights gallery —
needs no edge function at all and is real, working code in this pass.

## What you still need to add: extend `purchase-project`

When a purchase completes for an `event`-type project, the edge
function needs to also insert a row into `event_tickets`:

```
1. Generate ticket_code — a short, unguessable, unique string. Not
   sequential (e.g. "TICKET-1", "TICKET-2" lets anyone guess valid
   codes). A good option: 8-10 random base32/base36 characters, or a
   uuid you truncate for the human-readable code. Retry on unique-
   constraint conflict (astronomically rare, but don't skip the
   retry).
2. Insert into event_tickets:
   { project_id, buyer_id, recipient_email: buyer's email,
     ticket_code, ticket_image_url: null }
   (ticket_image_url stays null unless you later build the
   template-compositing step below — the fallback plain-text +
   QR ticket in TicketView.tsx works fine without it.)
3. (Optional) send the buyer an email with their ticket — this repo
   has no email-sending edge function to extend; add one if you want
   this. The ticket is already viewable in-app at
   /projects/:projectId/ticket without email being wired up.
```

## Optional stretch: composited ticket images

`EventFields.tsx` already lets a host upload a `ticket_template_url`
(a background image). If you want the polish of an actual generated
ticket image (background + overlaid attendee name/code/QR) rather
than the plain-text-plus-QR fallback `TicketView.tsx` renders today,
that compositing needs to happen server-side too (e.g. an edge
function using `@napi-rs/canvas` or similar, run after step 2 above,
writing the result to `ticket_image_url`). This is genuinely optional
— the fallback ticket is a complete, working ticket on its own.

## What's built and works today, no edge function needed

- **QR code rendering** (`TicketView.tsx`) — a real QR code (via the
  `qrcode` package, pure client-side) encoding the ticket's check-in
  URL, plus the human-readable `ticket_code` as a fallback if the
  code won't scan (industry-standard belt-and-suspenders — see the
  research notes below).
- **Check-in scanning** (`EventCheckIn.tsx`, new page, host-only) — a
  real camera-based QR scanner (via `jsqr`, pure client-side: draws
  video frames to a canvas and decodes them) plus a manual code-entry
  fallback for when a camera isn't available or a code won't scan.
  Looks the ticket up, shows a duplicate-scan warning if it's already
  checked in, and marks it checked in with a plain Supabase update —
  this is safe to do straight from the client because check-in isn't
  payment-critical, just "did this person show up," and it's gated by
  the RLS policy in `ako_projects_v6_event_extras.sql` (owner-only).
- **Post-event highlights gallery** (`useEventHighlights.ts`, wired
  into `ProjectDetail.tsx`) — the host uploads photos/video/audio
  after the event; public, no purchase required to view, since it's
  promotional content for the host's future events, not paid content.
- **"Add to calendar"** (`ProjectDetail.tsx`) — a client-generated
  `.ics` file, no backend needed.
- **Countdown + directions/join link** (`ProjectDetail.tsx`) — same
  pattern as Course/Meeting's countdowns.

## Ticketing research this was built against

Checked current (2026) small-scale event check-in practice: a unique
QR code per ticket (never one code shared across an event — that
defeats duplicate detection), validated live against the database on
scan with a "checked in" flag rather than a delete, a human-readable
ID as backup when a code won't scan, and a plain, high-contrast QR
render. This matches what `EventCheckIn.tsx` and the migration do —
deliberately skipping heavier stuff (offline scan queuing, bulk CSV
import, multi-device duplicate-scan racing) that's overkill at
solo-creator scale but is exactly what the big platforms (TicketSpice,
Eventbrite) add once volume justifies the complexity.
