# Room → "Cohort": what's built, what's cut, what's still needed

## The rename

Display label only: "Room" → "Cohort" everywhere (`PROJECT_TYPE_LABELS`
in `useProjects.ts`, plus the "Enter/Join cohort" CTA). The database's
`project_type` value stays `'room'`, and every table/hook/route keeps
the `room`/`useRoom` name. Renaming the actual identifier would mean
touching the DB enum, every RLS policy referencing `'room'`, and every
table name (`room_posts`, `room_meetings`, etc.) for a purely cosmetic
win — not worth the risk. Trivial to pick a different label later.

## Lifecycle

A Cohort now has real start/end dates (`project_room_details`,
editable from Create and Edit):

- No start date set → opens immediately, same as before.
- Future start date → members see a countdown, full stop (mirrors
  Course/Meeting/Event's existing countdown pattern).
- Past end date → **closed**: enforced by RLS, not just hidden in the
  UI. Regular members lose read access to chat and to non-media
  Classroom posts entirely; only media posts (video/audio/image/voice
  note) stay visible, and only to people who were actually members.
  Hosts can still read everything, and toggle a "View chat" button to
  see the archive — the toggle is UI, the actual permission is the
  RLS policy, so a host can't accidentally leak this to a regular
  member by flipping a client-side flag.
- Nothing can be posted into a closed cohort — chat, lectures,
  meetings, assignments, polls — by anyone, host included.

## Shared with chat, for real

The Cohort's group chat (`RoomChat.tsx`) runs on the exact same hooks
and components a 1:1 DM uses: `useMessages`, `useSendMessage`,
`useSendVoiceNote`, `useVoiceRecorder`, `VoiceRecordingBar`,
`VoicePreviewBar`, `VoiceMessageBubble`, `EmojiPickerSheet`. None of
that is a copy — a fix to the voice-note pipeline or the emoji picker
made in the DM thread is the same code running here. The Classroom
feed's voice-note lectures reuse the identical pipeline too (same
upload path, same `encodeVoiceNote`/`decodeVoiceNote`, same
`VoiceMessageBubble` for playback).

What *is* new, because a group chat needs it and a 1:1 thread
structurally can't: a lightweight member-list lookup so each message
shows its own sender's name and avatar (`useRoomMembersList`) — a DM
thread only ever has one "other participant," so nothing like this
existed to reuse.

## Co-hosts

Room is now a page-only type (`PROJECT_TYPE_ACCESS.room = "page"`), so
the primary co-host mechanism is the page's own team
(`page_members`) — anyone on the page's team is automatically a host
of every Cohort that page runs, no extra setup. On top of that,
`room_moderators` lets the actual project owner grant host status to
one specific person (e.g. a member of the cohort itself) without
adding them to the whole page's team. `is_room_host()` in the
migration checks both, plus plain ownership, in one place, so every
policy and the client both agree on who counts as staff.

## Moderation

Two toggles on `project_room_details`, changeable from the host
settings panel: mute chat entirely, or restrict it to hosts only. Both
enforced as RESTRICTIVE Postgres policies scoped to room-linked
conversations specifically — they default to *unrestricted* for any
conversation that isn't tied to a room, so normal DMs elsewhere in the
app are mechanically unaffected no matter what a host does here.

## Meetings

A room meeting is a real `useLiveKitRoom` call — the same integration
built for the standalone Meeting type — not a stub. Scheduling
notifies every member immediately (a DB trigger, not a stub), and a
finished recording drops into the Classroom feed automatically (also
a trigger, firing when `recording_url` goes from unset to set).

**Deliberate scope cut**: room meetings skip the standalone Meeting
type's device-preview lobby — joining goes straight into the call with
mic/camera on. Add the lobby step later if a cohort's calls turn out
to need it; it's the same `useLiveKitRoom` hook either way.

**Gap found on review, not a deliberate cut**: `RoomCallView` has no
start/stop recording button, even though `recording_enabled` is
captured at scheduling time. The standalone Meeting type's call view
already has one (`useStartMeetingRecording`/`useStopMeetingRecording`).
Once those edge functions exist, either add the same button here, or
have `mint-meeting-token` auto-start recording for any room meeting
with `recording_enabled = true` — see `BACKEND_HANDOFF.md`.

**Still needs backend** (see `MEETING_INFRA.md` — this is the same gap,
not a new one): `mint-meeting-token` needs to accept a `room_meetings`
row id as well as a standalone Meeting project id, since this passes
the room meeting's own id through as the identifier. The
recording-webhook also needs to write to `room_meetings.recording_url`
for room meetings specifically (it already knows how to do this for
standalone Meetings).

## Polls

WhatsApp-style: single- or multi-choice, live vote counts, tap to
toggle your own vote. Fully real, no backend gap — host-only creation,
member-only voting, both RLS-enforced.

## Assignment review

Previously impossible — there was no way for a host to see anyone's
submission but their own query of it, let alone leave feedback. Added
a host-only "see every submission for this assignment" view plus
approve / needs-revision / feedback-text, all real.

## Deliberately not built this pass

- **Non-text assignment submissions** (audio/video/image) — the
  required-format picker existed already, but there's no upload
  picker wired into the submission form; text-only for now, same
  honest gap the original stub had for lecture media.
- **Lecture image/video uploads** — a host can still post text and
  voice-note lectures (both fully working); dropping an actual
  video/image file into the Classroom feed needs a file-picker wired
  to a storage upload, which wasn't in scope for this pass.
- **Message reactions and reply-threading in Cohort chat** — both
  real features in the DM thread; left out here to keep the first
  version of group chat shippable rather than half-building both.
- **True T-minus reminders** (e.g. 1 hour before a meeting) — the
  "notify the instant it's scheduled" trigger is real; a countdown
  reminder needs a scheduled job (pg_cron or a timed edge function),
  which can't be set up from a migration alone.

## Migration to run

`ako_projects_v8_room_cohort.sql` — check it against the live schema
before running, especially the `page_members` column names in
`is_room_host()` (confirmed against `usePages.ts`'s usage, but not
against the actual table definition, which isn't in this repo).
