// File: supabase/functions/send-activity-push/index.ts
// Push for everything that lands in `notifications` / `page_notifications` except chat messages
// (those go through send-message-push, so "message" is deliberately absent from COPY below).
//
// Trigger path: AFTER INSERT triggers on both tables call public.invoke_push_function(), which posts
// { notification_id, source: "user" | "page" } here with the shared secret from Vault in
// `x-webhook-secret`. verify_jwt is OFF for this function; the secret is checked through the
// verify_push_webhook_secret() RPC instead of being copied into function env.
//
// Privacy: like send-message-push, titles and bodies are fixed templates plus the actor's display
// name. No comment text, DM text or preview_text ever goes into a push payload.
// Reactions (like, dislike, support, disagree, pushback, comment_like, comment_dislike) are not in
// COPY on purpose: they'd be a push per tap. Nothing here changes what the in-app list shows.
//
// Android: the channel id below MUST match src/lib/notificationChannels.ts in the native app.
// Sound is the phone's own notification sound ("default") — no custom audio file.
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100; // Expo's documented max per request
const CHANNEL_ACTIVITY = "activity_v2";

type Copy = { body: string; systemTitle?: boolean };

// Pushed types. `systemTitle` = there is no person behind it, so the title is "Akọ" not an actor name.
const COPY: Record<string, Copy> = {
  follow: { body: "started following you" },
  follow_request: { body: "requested to follow you" },
  follow_request_accepted: { body: "accepted your follow request" },
  comment: { body: "commented on your post" },
  comment_reply: { body: "replied to your comment" },
  post_comment_activity: { body: "There's new activity on a post you commented on", systemTitle: true },
  mention: { body: "mentioned you" },
  gift_received: { body: "sent you a gift" },
  reshare: { body: "reshared your post" },
  quote: { body: "quoted your post" },
  share: { body: "shared your post" },
  post_tagged: { body: "tagged you in a post" },
  project_tagged: { body: "Your project was tagged in a post", systemTitle: true },
  collaboration_invite: { body: "invited you to collaborate" },
  collaboration_accepted: { body: "accepted your collaboration invite" },
  page_role_invite: { body: "invited you to a page role" },
  page_role_accepted: { body: "accepted a page role" },
  give_back_received: { body: "You received a give-back", systemTitle: true },
  project_purchased: { body: "Someone purchased your project", systemTitle: true },
  affiliate_commission_earned: { body: "You earned an affiliate commission", systemTitle: true },
  withdrawal_status: { body: "Your withdrawal was updated", systemTitle: true },
  promotion_approved: { body: "Your promotion was approved", systemTitle: true },
  promotion_declined: { body: "Your promotion was declined", systemTitle: true },
  room_meeting_scheduled: { body: "A meeting was scheduled", systemTitle: true },
  admin_message: { body: "You have a new message from the Akọ team", systemTitle: true },
};
// page_notifications is a narrower set. Goes to the page's active admins.
const PAGE_COPY: Record<string, Copy> = {
  follow: { body: "started following your page" },
};

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

    if (source === "user") {
      const { data: n } = await admin.from("notifications").select("id, user_id, type, actor_id, read_at").eq("id", notification_id).maybeSingle();
      if (!n) return json({ sent: 0, reason: "notification not found" });
      if (n.read_at) return json({ sent: 0, reason: "already read" });
      type = n.type;
      actorId = n.actor_id;
      recipientIds = [n.user_id];
    } else {
      const { data: n } = await admin.from("page_notifications").select("id, page_id, type, actor_id, read_at").eq("id", notification_id).maybeSingle();
      if (!n) return json({ sent: 0, reason: "notification not found" });
      if (n.read_at) return json({ sent: 0, reason: "already read" });
      type = n.type;
      actorId = n.actor_id;
      const { data: admins } = await admin.from("page_members").select("user_id").eq("page_id", n.page_id).eq("status", "active").eq("is_admin", true);
      recipientIds = (admins ?? []).map((m) => m.user_id);
    }

    const copy = (source === "page" ? PAGE_COPY : COPY)[type];
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
    const title = copy.systemTitle || !actor ? "Akọ" : actor.display_name || actor.username || "Someone";
    const body = !copy.systemTitle && actor ? copy.body : copy.body.charAt(0).toUpperCase() + copy.body.slice(1);

    const messages = targets.map((t) => ({
      to: t.token,
      title,
      body,
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
