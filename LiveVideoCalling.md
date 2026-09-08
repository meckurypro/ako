# Task: finish wiring live video calling into the "Meeting" project type

## Context

This repo (Ako) has a "Meeting" project type — a creator schedules a
session, people pay (or get free access) to join, and it's meant to
work like a paid Zoom/Google Meet: countdown to start time, live call
with screen share, optional recording, and in-call file/link sharing.

The frontend side of this was already built in a previous session and
is real, working code — not a mockup. What's *not* done is the actual
video-calling backend, because that genuinely requires third-party
infrastructure (a signaling/media server) and secrets that can't live
in a frontend repo. That's the only thing left.

**Start by reading `MEETING_INFRA.md` in the repo root.** It has the
full research (why LiveKit was chosen over Daily/Agora/Twilio), and
exact pseudocode for every edge function described below. Everything
in this prompt is a summary of that file — treat it as the source of
truth if anything here seems out of date.

Also read these files to see what's already built before writing
anything:
- `src/hooks/useLiveKitRoom.ts` — the real `livekit-client` SDK
  integration (connect, publish camera/mic, screen share, render
  remote participants). Calls an edge function named
  `mint-meeting-token` that doesn't exist yet.
- `src/pages/MeetingRoom.tsx` — the full page: privacy gate, buy-gate,
  countdown, lobby with device preview + recording consent, live call
  grid, host-only record button, in-call shared items panel,
  post-meeting recordings list.
- `src/hooks/useMeetingRecordings.ts` — reads a `meeting_recordings`
  table (doesn't exist until the migration runs) and calls
  `get-meeting-recording`, `start-meeting-recording`, and
  `stop-meeting-recording` edge functions (none exist yet).
- `src/hooks/useMeetingSharedItems.ts` — this one is **already fully
  functional**, no third-party service involved, just Supabase +
  Realtime. It needs the migration below to have a table to talk to,
  nothing else.
- `ako_projects_v5_meeting_infra.sql` — the migration (not yet run
  against the live database). Adds `project_meeting_details.recording_enabled`,
  and two new tables: `meeting_shared_items` and `meeting_recordings`,
  with RLS policies.

## What's already done (do not rebuild these)

- Lobby, countdown, device-check preview, recording-consent notice
- Live call UI: participant grid, mute/camera/screen-share/leave
  controls, all wired to real `livekit-client` methods
- In-call shared files/links/messages (fully working today once the
  migration runs — no video provider needed for this part)
- Post-meeting recordings list/player (will work automatically once
  rows exist in `meeting_recordings`)
- Privacy gating (private meetings), purchase gating, free-access
  gating — all already correct
- The `recording_enabled` toggle the creator sets when scheduling the
  meeting

## What's actually left (in order)

### 1. Run the migration
Run `ako_projects_v5_meeting_infra.sql` against the Supabase project.
Check the column types/constraint names against the real schema first
— this file was written without direct access to the live database,
so it's best-effort and may need small adjustments.

### 2. Create a LiveKit account (or self-hosted server)
Sign up at LiveKit Cloud (or stand up a self-hosted server). You'll
get three values: `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
`LIVEKIT_API_SECRET`. Only `LIVEKIT_URL` is safe on the client
(`VITE_LIVEKIT_URL` env var). The key/secret go in edge function
environment variables only — never the client bundle.

### 3. Write `mint-meeting-token` (edge function)
Called by the client right before joining. Must:
- Verify the caller's Supabase JWT
- Re-check access **server-side** (owner, free project, or a
  `purchases` row for this user+project) — don't trust the client
- Create the LiveKit room on first call if `provider_room_id` is empty,
  save it back to `project_meeting_details`
- Mint a LiveKit `AccessToken` (owner gets `roomAdmin: true` so they
  can start/stop recording)
- Return `{ token, url }`

Full pseudocode is in `MEETING_INFRA.md` under "Edge function:
mint-meeting-token".

### 4. Write `start-meeting-recording` / `stop-meeting-recording`
Host-only (the button in `MeetingRoom.tsx` already gates this to
`isOwner`). Calls LiveKit's `startRoomCompositeEgress` /
`stopEgress`. Pseudocode in `MEETING_INFRA.md`.

### 5. Write the `livekit-webhook` edge function
LiveKit calls this when a recording (Egress job) finishes. Must:
- Get the finished file from wherever LiveKit Egress uploaded it
- Copy it into the `private-content` Supabase bucket (same bucket
  File/Media projects already use)
- Insert a row into `meeting_recordings` using the service-role key
- Configure this URL in the LiveKit project's webhook settings

This is the "recording is automatically shared as an end product"
requirement — the frontend already polls `meeting_recordings` and
will show it the moment this webhook inserts a row. No frontend
change needed here.

### 6. Write `get-meeting-recording`
Mirrors the existing `get-project-file` function's pattern for
File/Media types: takes `{ recordingId }`, re-checks access
server-side, returns a short-lived signed URL `{ url }` for
`meeting_recordings.file_path`.

## Testing checklist once the above is done

- [ ] Create a Meeting project, schedule it a minute out, toggle
      recording on
- [ ] As the buyer (or free access), confirm the lobby shows camera
      preview + recording consent notice
- [ ] Join as two different accounts/devices — confirm both see each
      other's video/audio
- [ ] Screen-share from one side, confirm it appears full-size for
      others
- [ ] Start recording as host, confirm the on-screen recording
      indicator shows for everyone
- [ ] Share a link and a file in the in-call panel, confirm both
      participants see it appear live
- [ ] End the call, stop recording, wait for the webhook — confirm
      the recording shows up on the meeting page afterward and plays

## Guardrails

- Don't touch `useMeetingSharedItems.ts` or the shared-items UI in
  `MeetingRoom.tsx` — that part is done and doesn't depend on
  anything in this task.
- Don't rebuild the call UI, device preview, or countdown — only add
  the backend pieces listed above and wire the 3 already-referenced
  function names (`mint-meeting-token`, `start-meeting-recording`,
  `stop-meeting-recording`) plus the webhook and
  `get-meeting-recording`.
- If the live database schema differs from what the migration
  assumes (column types, table names), adjust the migration to match
  reality rather than changing the frontend hooks to match a guess.
