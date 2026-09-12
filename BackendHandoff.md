# Backend handoff — what's left, in one place

This is the single reference for what still needs backend work across
everything built in the recent project-type passes (Course, Meeting,
Event, Gig, Room/"Cohort"). Everything listed here is **frontend-complete
and waiting on you** — not half-built UI. Where a more detailed spec
already exists in another file, this points to it instead of repeating
it; where nothing else covers it, the detail is here.

## 0. The one thing blocking everything: payment

`purchase-project` (the edge function every "Buy" button calls) is
broken. This has been true since before any of this work started and
nothing in these passes fixed it — it's out of reach from a frontend
session. Until it works: no purchases complete, no event tickets get
issued, no gig deposits land, nothing downstream of a purchase can be
tested end-to-end with real money. This is the highest-leverage single
fix available — everything else on this list only matters once
purchases actually go through.

## 1. Migrations — status

Run in this order if you haven't already (each one is idempotent —
`create table if not exists`, `drop policy if exists` — safe to
re-run):

| File | Covers |
|---|---|
| `ako_projects_v4_course_progress.sql` | Course free-preview flag, lesson progress tracking |
| `ako_projects_v5_meeting_infra.sql` | Meeting `recording_enabled`, in-call shared items, recordings table |
| `ako_projects_v6_event_extras.sql` | Ticket check-in tracking, public highlights gallery + bucket |
| `ako_projects_v7_gig_extras.sql` | Gig deliverables/FAQ/revisions, reviews table |
| `ako_projects_v8_room_cohort.sql` | Room/Cohort lifecycle, group chat RLS, polls, co-hosts, assignment review |

You already hit and fixed one syntax bug in `v8` (restrictive policy
clause order — `ON table AS RESTRICTIVE`, not `AS RESTRICTIVE ON
table`). If any *other* file in this list throws a syntax error, it's
worth specifically checking for that same pattern — it was a mistake
made once and could plausibly recur elsewhere I haven't been told
about yet.

One unverified line, flagged honestly: `v8`'s
`get_or_create_room_conversation()` function does
`insert into conversations default values`. This only works if every
column on your `conversations` table has a default or allows null. If
you hit an error specifically on that line, it means there's a
required column (e.g. `created_by`) that needs a value added to that
insert.

## 2. Edge functions needed

### The LiveKit set (shared by Meeting *and* Room/Cohort — build once, both use it)

Both `useLiveKitRoom.ts` (standalone Meeting) and `Room.tsx`'s call
view pass a generic identifier through to these — a standalone
Meeting passes its project id, a Cohort meeting passes its
`room_meetings.id`. Write these to accept either and branch on which
table has a matching row.

1. **`mint-meeting-token`** — verifies the caller, re-checks access
   server-side (never trust the client), creates the LiveKit room on
   first call, returns `{ token, url }`. Full pseudocode: `MEETING_INFRA.md`.
2. **`start-meeting-recording`** / **`stop-meeting-recording`** —
   host-only, calls LiveKit's Egress API. Full pseudocode: `MEETING_INFRA.md`.
3. **`livekit-webhook`** — LiveKit calls this when a recording
   finishes; uploads the file to your storage, sets
   `recording_url` on the matching row (`project_meeting_details` or
   `room_meetings`). For Room specifically, once `recording_url` is
   set, a DB trigger (already in `v8`) automatically drops it into the
   Classroom feed — no extra code needed there.
4. **`get-meeting-recording`** — signs a short-lived playback URL,
   same pattern as the existing `get-project-file`.

**Known gap in the UI that depends on these existing:** standalone
Meeting's call view (`MeetingRoom.tsx`) already has a host-facing
"start/stop recording" button wired to #2. **Room's call view
(`RoomCallView` inside `Room.tsx`) does not** — it only stores
`recording_enabled` as a scheduling-time flag with nothing that
actually triggers recording once the call starts. Once #2 exists,
either (a) add the same start/stop button to `RoomCallView`, mirroring
`MeetingRoom.tsx`, or (b) have `mint-meeting-token` auto-start
recording for any meeting where `recording_enabled = true` the moment
the first participant joins, if you'd rather it be automatic for
cohorts specifically. Neither is built yet — pick one and it's a small
addition either way.

### Event ticketing

5. **Ticket issuance inside `purchase-project`** — when a purchase
   completes for an `event`-type project, insert a row into
   `event_tickets` (generate an unguessable `ticket_code`, store
   `recipient_email`). Nothing does this today, which is why every
   ticket page currently shows "still being issued" forever after a
   real purchase. Full pseudocode: `EVENT_INFRA.md`.
6. **(Optional)** composited ticket images — only needed if you want
   an actual designed ticket graphic instead of the working
   plain-text-plus-QR fallback that already renders without this.

### Everything else

Nothing else on the list needs new backend — Gig reviews, Course
progress, Room polls/chat/moderation/co-hosts/assignment-review are
all plain Supabase reads/writes already gated correctly by RLS from
their migrations above. If something in those areas doesn't work
after running the migrations, it's a bug to report, not a missing
edge function.

## 3. True reminders (nice-to-have, not blocking)

Meeting and Room both notify members the instant a meeting is
*scheduled* (a DB trigger already does this — real, not stubbed). A
countdown-style reminder ("starts in 1 hour") needs a scheduled job —
`pg_cron` calling a function on a timer, or a timed edge function —
which can't be set up from a migration alone. Not blocking anything
else; add it whenever.

## 4. Where the fuller detail already lives

- `MEETING_INFRA.md` — LiveKit provider comparison/rationale, full
  pseudocode for all 4 shared edge functions above.
- `EVENT_INFRA.md` — ticket issuance pseudocode, ticketing research
  notes.
- `ROOM_COHORT_ARCHITECTURE.md` — the Cohort rename, lifecycle rules,
  co-host resolution logic, everything cut from scope on purpose.

If any of those three files aren't actually sitting in your repo,
this file alone still covers what to build — the three above add
reasoning and full pseudocode, not new requirements.
