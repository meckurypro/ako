# Meeting infrastructure — what's real, what's stubbed, and why

## The honest boundary

A real multi-party call with screen share and server-side recording
needs a signaling server + SFU (selective forwarding unit) sitting
between participants — browsers can't reliably mesh-connect and
record themselves at any real quality or group size. That's
infrastructure, not a React component, and it can't be stood up from
inside this repo: it needs a video-provider account, API secrets that
must never reach the client, and edge functions running in *your*
Supabase project (which this repo doesn't contain — same note as
prior passes on this codebase).

So this pass does two things honestly:
1. Builds everything that genuinely can be done from the frontend +
   Supabase alone — the lobby, the countdown, the live call UI wired
   to a real SDK, the in-call shared-files panel (fully working today
   off Supabase, no video provider needed), and the post-meeting
   recordings list.
2. Wires the call itself against **LiveKit**'s real client SDK
   (`livekit-client`, actually installed in this repo — see
   `package.json`) so the moment the three pieces below exist, the
   frontend needs zero further changes to go live.

## Why LiveKit

Researched against Daily, Agora, 100ms, Twilio Video (Sept 2026
pricing/feature comparisons):

| | LiveKit | Daily | Agora |
|---|---|---|---|
| Cost at your likely scale | ~$0.0004–0.0005/participant-min (Cloud), or free self-hosted | $0.004/participant-min after 10K free/mo | $3.99–8.99 per 1,000 min |
| Self-hostable | Yes, fully open-source | No | No |
| Screen share (any participant) | Native | Native | Native |
| Server-side composite recording (audio+video+screen → one file) | Yes — **Egress** API | Yes — Recording API | Yes — Cloud Recording |
| npm client SDK | `livekit-client` | `@daily-co/daily-js` | `agora-rtc-sdk-ng` |

LiveKit is the cheapest by roughly an order of magnitude at low-to-mid
volume, is the only one you could self-host later if you ever wanted
to own the infrastructure outright (consistent with how this app
already owns its own Postgres/storage rather than renting a BaaS
black box), and its Egress API is built specifically for "record this
whole room, including whoever's sharing their screen, as one file" —
exactly the "automatically shared as an end product" requirement.
Daily is the fallback if you'd rather not touch a Docker container —
same shape of integration, swap the SDK.

## What you still need to add (outside this repo)

**1. A LiveKit Cloud project (or self-hosted server)**
Gives you `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
The URL is safe on the client (`VITE_LIVEKIT_URL` env var — see
`useLiveKitRoom.ts`); the key/secret must only ever live in edge
function environment variables, never the client bundle.

**2. Edge function: `mint-meeting-token`**
Client calls this (already wired in `useLiveKitRoom.ts`) right before
joining. Server-side:
```
1. Verify the caller is authenticated (Supabase JWT).
2. Look up the project's project_meeting_details row for `projectId`.
3. Re-check access server-side — owner, free, or has a `purchases` row
   for this project+user. (Same rule the client already enforces for
   UI purposes, but the token mint is the actual security boundary —
   never trust the client's hasAccess for this.)
4. If projectId has no provider_room_id yet, create one:
     roomService.createRoom({ name: projectId })
   and store it back on project_meeting_details.provider_room_id.
5. Build a LiveKit AccessToken for (roomName, participantIdentity =
   user.id, participantName = user's display name), grant
   { roomJoin: true, room: roomName, canPublish: true, canSubscribe: true }.
   Owner additionally gets `roomAdmin: true` (needed to start/stop
   Egress and to mute/remove participants).
6. Return { token, url: LIVEKIT_URL }.
```

**3. Edge functions: `start-meeting-recording` / `stop-meeting-recording`**
Called only by the host (button already wired in `MeetingRoom.tsx`,
guarded to `isOwner`).
```
start-meeting-recording:
  roomService.startRoomCompositeEgress(roomName, {
    fileOutputs: [{ filepath: `meetings/${projectId}/{room_name}-{time}` }],
  }) → egressId, store on project_meeting_details (e.g. a
  current_egress_id column, or in-memory if you don't need resume-safety).

stop-meeting-recording:
  roomService.stopEgress(egressId)
```

**4. Edge function / webhook: `livekit-webhook`**
LiveKit calls this URL (configured in your LiveKit project settings)
when an Egress finishes.
```
On `egress_ended` event with status COMPLETE:
  1. Download the file LiveKit uploaded to your configured egress
     storage (S3/GCS — LiveKit Egress needs *some* blob destination;
     point it at a bucket you control, or receive the file URL it
     hands back).
  2. Re-upload (or copy) it into the `private-content` Supabase bucket,
     same one File/Media projects already use.
  3. Insert a row into `meeting_recordings` (project_id, file_path)
     using the service-role key.
  4. Optionally also set project_meeting_details.status = 'ended' and
     clear provider_room_id.
```
This is the "recording is automatically shared in the meeting as an
end product" requirement — `useMeetingRecordings.ts` on the frontend
already reads this table and will show it the moment this webhook
inserts the row, no other frontend change needed.

**5. Playback: a `get-meeting-recording` function**
`useMeetingRecordings.ts` calls this with `{ recordingId }`, expecting
the same shape `get-project-file` already returns (`{ url }`, a
short-lived signed URL) — it re-checks access the same way
get-project-file already does for File/Media, then signs
`meeting_recordings.file_path`.

## What's built and works today, no provider needed

- **`useMeetingSharedItems.ts`** — real, working now (once the
  migration runs): messages/links/files posted during the call, live
  via Supabase Realtime, files going through the existing
  `useUploadProjectFile` → `private-content` bucket pipeline.
- **Lobby, countdown, consent screen, call-UI shell, controls,
  participant grid, recording banner** — all real code against
  `livekit-client`'s actual API. It shows a clear "video calling isn't
  connected yet" state (not a silent failure) until `mint-meeting-token`
  exists, rather than pretending to work.
- **Recordings list/player** — real once `meeting_recordings` has rows
  in it (from the webhook above).
