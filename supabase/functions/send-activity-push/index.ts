// File: supabase/functions/send-activity-push/index.ts
// Push for everything that lands in `notifications` / `page_notifications` except chat messages
// (those go through send-message-push, so "message" is deliberately absent from COPY below).
//
// Trigger path: AFTER INSERT triggers on both tables call public.invoke_push_function(), which posts
// { notification_id, source: "user" | "page" } here with the shared secret from Vault in
// `x-webhook-secret`. verify_jwt is OFF for this function; the secret is checked through the
// verify_push_webhook_secret() RPC instead of being copied into function env.
//
// Privacy: like send-message-push, bodies are fixed templates. No comment text, DM text or
// preview_text ever goes into a push payload. The title is always "Akọ"; the body is one plain
// sentence. For social events (likes, comments, replies, shares, gifts, mentions...) the sentence
// starts with the actor's name only if the recipient knows them (either follows the other),
// otherwise "Someone". Follows, invites and other things you must act on always carry the name.
// Dislikes (post and comment) are deliberately not pushed. Reactions are deduped per
// actor/type/target by the notify_* triggers, so it is one push per person per thing, not per tap.
// Nothing here changes what the in-app list shows.
//
// Android: the channel id below MUST match src/lib/notificationChannels.ts in the native app.
// Sound is the phone's own notification sound ("default") — no custom audio file.
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100; // Expo's documented max per request
const CHANNEL_ACTIVITY = "activity_v2";

// `body` is the verb phrase ("shared your post"). `systemTitle` = no person behind it, body is a full
// sentence. `social` = apply the known-vs-"Someone" naming rule; without it an actor is always named.
type Copy = { body: string; systemTitle?: boolean; social?: boolean };

// Pushed types. `systemTitle` = there is no person behind it, so the title is "Akọ" not an actor name.
const COPY: Record<string, Copy> = {
  follow: { body: "started following you" },
  follow_request: { body: "requested to follow you" },
  follow_request_accepted: { body: "accepted your follow request" },
  comment: { body: "commented on your post", social: true },
  comment_reply: { body: "replied to your comment", social: true },
  // like / support / pushback / question / comment_like / share / post_comment_activity depend on what they
  // were done to, so they are worded by resolveCopy() below, not listed here.
  mention: { body: "mentioned you", social: true },
  gift_received: { body: "gifted you", social: true },
  reshare: { body: "reposted your post", social: true },
  quote: { body: "quoted your post", social: true },
  post_tagged: { body: "tagged you in a post", social: true },
  project_tagged: { body: "Your project was tagged in a post", systemTitle: true },
  project_forked: { body: "forked your project" },
  forked_project_tagged: { body: "tagged your project in a post", social: true },
  project_access_granted: { body: "gave you access to a private project" },
  file_downloaded: { body: "downloaded your file" },
  collaboration_invite: { body: "invited you to collaborate" },
  collaboration_accepted: { body: "accepted your collaboration invite" },
  foreword_invite: { body: "asked you to write a foreword" },
  foreword_submitted: { body: "wrote a foreword for your project" },
  foreword_approved: { body: "added your foreword to their project" },
  foreword_declined: { body: "declined to write a foreword" },
  page_role_invite: { body: "invited you to a page role" },
  page_role_accepted: { body: "accepted a page role" },
  // Page-role catalogue: someone typed a role that isn't in the list (goes to admins), and the admin's decision (goes to the people waiting on it).
  page_role_requested: { body: "requested a new page role" },
  page_role_approved: { body: "Your page role was approved", systemTitle: true },
  page_role_rejected: { body: "Your page role wasn't approved", systemTitle: true },
  give_back_received: { body: "You received a give-back", systemTitle: true },
  project_purchased: { body: "Someone purchased your project", systemTitle: true },
  affiliate_commission_earned: { body: "You earned an affiliate commission", systemTitle: true },
  withdrawal_status: { body: "Your withdrawal was updated", systemTitle: true },
  promotion_approved: { body: "Your promotion was approved", systemTitle: true },
  promotion_declined: { body: "Your promotion was declined", systemTitle: true },
  room_meeting_scheduled: { body: "A meeting was scheduled", systemTitle: true },
  room_meeting_reminder: { body: "A Room meeting is coming up tomorrow", systemTitle: true },
  room_meeting_soon: { body: "A Room meeting starts in 15 minutes", systemTitle: true },
  room_meeting_starting: { body: "A Room meeting is starting now", systemTitle: true },
  room_meeting_rescheduled: { body: "A Room meeting was rescheduled", systemTitle: true },
  room_meeting_cancelled: { body: "A Room meeting was cancelled", systemTitle: true },
  room_join_request: { body: "asked to join your Room" },
  room_join_approved: { body: "Your request to join a Room was approved", systemTitle: true },
  room_join_declined: { body: "Your request to join a Room was declined", systemTitle: true },
  room_member_added: { body: "You were added to a group", systemTitle: true },
  room_invite: { body: "invited you to join a group" },
  room_invite_accepted: { body: "accepted your invitation to join a group" },
  room_invite_declined: { body: "declined your invitation to join a group" },
  room_member_removed: { body: "You were removed from a Room", systemTitle: true },
  admin_message: { body: "You have a new message from the Akọ team", systemTitle: true },
};
// page_notifications is a narrower set. Goes to the page's active admins.
const PAGE_COPY: Record<string, Copy> = {
  follow: { body: "started following your page" },
};

type NotifRow = {
  type: string;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  previewText: string | null;
};

// Top-level stance comments (notify_on_comment stores the stance as the notification type). "comment" is the neutral
// stance and is worded by COPY. "disagree" only exists on old rows: it was merged into pushback.
const STANCE_ON_POST: Record<string, string> = {
  support: "added to your post",
  pushback: "pushed back on your post",
  disagree: "pushed back on your post",
  question: "asked a question on your post",
};

// Words the notification for what it actually is. Returns null for anything that isn't pushed.
// Rows differ by what they were done to, which the `type` alone doesn't say:
//  - support / pushback / question on a POST are top-level stance comments (notify_on_comment stores the stance as
//    the type), so they are worded as the stance, not as a generic "commented".
//  - post_comment_activity goes to the POST's author when someone replies to, reacts to or gifts a
//    comment under their post, so it is resolved from the comment's own side effects.
async function resolveCopy(admin: ReturnType<typeof createClient>, n: NotifRow): Promise<Copy | null> {
  const direct = COPY[n.type];
  if (direct) return direct;

  const onProject = n.targetType === "project";
  const onComment = n.targetType === "comment";
  const thing = onProject ? "project" : onComment ? "comment" : "post";

  switch (n.type) {
    case "like":
      return { body: `liked your ${thing}`, social: true };
    case "share":
      return { body: `shared your ${onProject ? "project" : "post"}`, social: true };
    case "comment_like":
      return { body: "liked your comment", social: true };
    case "support":
    case "disagree":
    case "pushback":
    case "question":
      return { body: STANCE_ON_POST[n.type], social: true };
    case "post_comment_activity": {
      if (!n.targetId || !n.actorId) return { body: "engaged with a comment on your post", social: true };
      if (n.previewText) return { body: "replied to a comment on your post", social: true };
      const { data: gift } = await admin
        .from("gifts").select("id").eq("sender_id", n.actorId).eq("comment_id", n.targetId).limit(1).maybeSingle();
      if (gift) return { body: "gifted a comment on your post", social: true };
      const { data: reaction } = await admin
        .from("reactions").select("type").eq("user_id", n.actorId).eq("comment_id", n.targetId).limit(1).maybeSingle();
      const rt = (reaction as { type?: string } | null)?.type;
      if (rt === "like") return { body: "liked a comment on your post", social: true };
      if (rt === "dislike") return null;
      return { body: "engaged with a comment on your post", social: true };
    }
    default:
      return null; // dislike, comment_dislike and anything unlisted
  }
}

type ExpoTicket = { status: "ok" | "error"; id?: string; message?: string; details?: { error?: string } };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: authorised, error: secretError } = await admin.rpc("verify_push_webhook_secret", {
    p_secret: req.headers.get("x-webhook-secret"),
  });
  if (secretError || authorised !== true) return json({ error: "Unauthorized" }, 401);

  try {
    const { notification_id, source } = await req.json();
    if (typeof notification_id !== "string" || (source !== "user" && source !== "page")) {
      return json({ error: "notification_id and source ('user' | 'page') are required" }, 400);
    }

    let type: string;
    let actorId: string | null;
    let recipientIds: string[];
    let row: NotifRow | null = null;

    if (source === "user") {
      const { data: n } = await admin.from("notifications").select("id, user_id, type, actor_id, read_at, target_type, target_id, preview_text").eq("id", notification_id).maybeSingle();
      if (!n) return json({ sent: 0, reason: "notification not found" });
      if (n.read_at) return json({ sent: 0, reason: "already read" });
      type = n.type;
      actorId = n.actor_id;
      recipientIds = [n.user_id];
      row = { type: n.type, actorId: n.actor_id, targetType: n.target_type, targetId: n.target_id, previewText: n.preview_text };
    } else {
      const { data: n } = await admin.from("page_notifications").select("id, page_id, type, actor_id, read_at").eq("id", notification_id).maybeSingle();
      if (!n) return json({ sent: 0, reason: "notification not found" });
      if (n.read_at) return json({ sent: 0, reason: "already read" });
      type = n.type;
      actorId = n.actor_id;
      const { data: admins } = await admin.from("page_members").select("user_id").eq("page_id", n.page_id).eq("status", "active").eq("is_admin", true);
      recipientIds = (admins ?? []).map((m) => m.user_id);
    }

    const copy = source === "page" ? PAGE_COPY[type] : row ? await resolveCopy(admin, row) : null;
    if (!copy) return json({ sent: 0, reason: "type not pushed" });

    // Never notify someone about their own action.
    recipientIds = recipientIds.filter((id) => id !== actorId);
    if (!recipientIds.length) return json({ sent: 0, reason: "no recipients" });

    const [actorRes, blocksRes, mutesRes, tokensRes] = await Promise.all([
      actorId ? admin.from("profiles").select("display_name, username").eq("id", actorId).maybeSingle() : Promise.resolve({ data: null }),
      actorId ? admin.from("blocked_users").select("blocker_id").eq("blocked_id", actorId).in("blocker_id", recipientIds) : Promise.resolve({ data: [] }),
      actorId ? admin.from("muted_users").select("muter_id").eq("muted_id", actorId).in("muter_id", recipientIds) : Promise.resolve({ data: [] }),
      admin.from("push_tokens").select("id, token, user_id").in("user_id", recipientIds),
    ]);

    const suppressed = new Set([
      ...((blocksRes.data ?? []) as { blocker_id: string }[]).map((b) => b.blocker_id),
      ...((mutesRes.data ?? []) as { muter_id: string }[]).map((m) => m.muter_id),
    ]);
    const targets = ((tokensRes.data ?? []) as { id: string; token: string; user_id: string }[]).filter((row) => !suppressed.has(row.user_id));
    if (!targets.length) return json({ sent: 0, reason: "no eligible tokens" });

    const actor = actorRes.data as { display_name?: string; username?: string } | null;
    const actorName = actor?.display_name || actor?.username || null;

    // "Someone they know" = either of them follows the other. Only looked up for social events.
    const knows = new Set<string>();
    if (copy.social && actorId && actorName) {
      const [theyFollowActor, actorFollowsThem] = await Promise.all([
        admin.from("follows").select("follower_id").eq("following_id", actorId).in("follower_id", recipientIds),
        admin.from("follows").select("following_id").eq("follower_id", actorId).in("following_id", recipientIds),
      ]);
      ((theyFollowActor.data ?? []) as { follower_id: string }[]).forEach((r) => knows.add(r.follower_id));
      ((actorFollowsThem.data ?? []) as { following_id: string }[]).forEach((r) => knows.add(r.following_id));
    }

    const bodyFor = (userId: string): string => {
      if (copy.systemTitle || !actorId) return copy.body.charAt(0).toUpperCase() + copy.body.slice(1);
      const name = copy.social ? (knows.has(userId) && actorName ? actorName : "Someone") : actorName || "Someone";
      return `${name} ${copy.body}`;
    };

    const messages = targets.map((t) => ({
      to: t.token,
      title: "Akọ",
      body: bodyFor(t.user_id),
      sound: "default", // the phone's own notification sound (Android: set by the channel; iOS: this field)
      priority: "high", // deliver promptly even when the device is dozing
      channelId: CHANNEL_ACTIVITY,
      data: { type: "activity", notificationType: type, notificationId: notification_id, source },
    }));

    const tickets: ExpoTicket[] = [];
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(messages.slice(i, i + BATCH_SIZE)),
      });
      const parsed = await response.json().catch(() => null);
      if (Array.isArray(parsed?.data)) tickets.push(...(parsed.data as ExpoTicket[]));
      else console.error("send-activity-push: unexpected Expo response", response.status, parsed);
    }

    // Tokens Expo already knows are dead are pruned now; everything else waits for its receipt
    // (check-push-receipts). Any OTHER ticket error (InvalidCredentials = no FCM key uploaded to EAS,
    // MessageRateExceeded, ...) is logged loudly — it used to vanish silently.
    const deadTokenIds: string[] = [];
    const pending: { ticket_id: string; token: string }[] = [];
    const ticketErrors: Record<string, number> = {};
    tickets.forEach((ticket, index) => {
      const target = targets[index];
      if (!target) return;
      if (ticket.status === "error") {
        const reason = ticket.details?.error ?? "unknown";
        if (reason === "DeviceNotRegistered") deadTokenIds.push(target.id);
        else ticketErrors[reason] = (ticketErrors[reason] ?? 0) + 1;
      } else if (ticket.status === "ok" && ticket.id) pending.push({ ticket_id: ticket.id, token: target.token });
    });
    if (Object.keys(ticketErrors).length) console.error("send-activity-push: Expo ticket errors", ticketErrors);
    if (deadTokenIds.length) await admin.from("push_tokens").delete().in("id", deadTokenIds);
    if (pending.length) await admin.from("push_tickets").upsert(pending, { onConflict: "ticket_id", ignoreDuplicates: true });

    return json({ sent: targets.length, accepted: pending.length, pruned: deadTokenIds.length, errors: ticketErrors });
  } catch (error) {
    console.error("send-activity-push error:", error);
    return json({ error: String(error) }, 500);
  }
});
