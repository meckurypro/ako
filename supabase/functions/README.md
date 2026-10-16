# Edge functions (push)

Source of truth for the push pipeline's edge functions. Deploy with the Supabase CLI
(`supabase functions deploy <name>`) or the dashboard.

| Function | verify_jwt | Called by |
|---|---|---|
| `send-message-push` | on | the native app, after a chat message insert (`notifyMessagePush`) |
| `send-activity-push` | off (shared secret in `x-webhook-secret`) | DB triggers on `notifications` / `page_notifications` via `invoke_push_function()` |
| `check-push-receipts` | off (shared secret) | pg_cron, every 15 min |
| `delete-project` | on | the native app and web, when an owner deletes a project (`useDeleteProject`) |

## Android channel ids

`messages_v2` and `activity_v2` must match `src/lib/notificationChannels.ts` in `ako.native`.
Android channels are immutable once created on a device, so change a channel's sound/importance/
vibration only by introducing a new id (and updating both sides). Sound is `"default"` — the phone's
own notification sound.

## If pushes silently don't arrive

Expo's push API accepts a request (HTTP 200) and reports failure per message in the *ticket*.
`InvalidCredentials` ("Unable to retrieve the FCM server key…") means no FCM V1 service-account key is
uploaded to EAS for the Android app: run `eas credentials -p android` → Google Service Account →
Push Notifications (FCM V1). Both send functions now log ticket errors.

## Known gaps in chat push (not yet server-driven)

`send-message-push` is invoked by the *sender's app* after the insert. The app now retries through a
durable outbox (`src/lib/pushNotify.ts` in `ako.native`), but a message still produces no push when it is
sent from somewhere that never calls the function: the web client, and `page_messages` (page inbox
replies). The robust fix is an AFTER INSERT trigger on `messages` / `page_messages` that posts to this
function with the shared secret (the way `notifications` does for `send-activity-push`), with the function
accepting that secret as an alternative to the caller's JWT.

## Deleting projects

`delete-project` hard-deletes a project owned by the caller. Purchases, music licence acceptances and assignment submissions
are kept on purpose (RESTRICT foreign keys), so a project with those gets a 409 with a plain message telling the owner to
archive it instead. Course lessons cascade with their module (`supabase/ako_course_lessons_cascade.sql`).
