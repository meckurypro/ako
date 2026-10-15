// File: supabase/functions/send-message-push/index.ts
// Invoked (fire-and-forget) from the native app right after a message insert succeeds
// (lib/pushNotify.ts → notifyMessagePush). Chat messages stay on this client-invoked path;
// everything else in `notifications` is pushed by send-activity-push from a DB trigger.
//
// Deliberately does not put message content in the push title/body: DM content shouldn't end up
// sitting in a push payload or an OS notification tray (and E2EE is staged, so a plaintext body
// would need rework anyway).
//
// Android: the channel id below MUST match src/lib/notificationChannels.ts in the native app.
// Android channels are immutable once created on a device, which is why the ids carry a version
// suffix. A device that doesn't have the channel falls back to the app's default channel.
// Sound is the phone's own notification sound ("default") — no custom audio file.
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100; // Expo's documented max per request
const CHANNEL_MESSAGES = "messages_v2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ExpoTicket = { status: "ok" | "error"; id?: string; message?: string; details?: { error?: string } };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message_id } = await req.json();
    if (!message_id || typeof message_id !== "string") {
      return new Response(JSON.stringify({ error: "message_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: message, error: messageError } = await admin
      .from("messages")
      .select("id, conversation_id, sender_id, content")
      .eq("id", message_id)
      .single();
    if (messageError || !message) {
      return new Response(JSON.stringify({ error: "Message not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // The caller must be the message's own sender — this endpoint only ever
    // notifies *about* a message the caller just sent, never lets a client
    // trigger a push for a message it doesn't own.
    if (message.sender_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [{ data: sender }, { data: participants, error: participantsError }] = await Promise.all([
      admin.from("profiles").select("display_name, username").eq("id", message.sender_id).single(),
      admin
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", message.conversation_id)
        .neq("user_id", message.sender_id)
        .is("left_at", null),
    ]);
    if (participantsError) throw participantsError;

    const recipientIds = (participants ?? []).map((p) => p.user_id);
    if (!recipientIds.length) return new Response(JSON.stringify({ sent: 0, reason: "no recipients" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const [{ data: blocks }, { data: mutes }, { data: tokenRows }] = await Promise.all([
      admin.from("blocked_users").select("blocker_id").eq("blocked_id", message.sender_id).in("blocker_id", recipientIds),
      admin.from("muted_users").select("muter_id").eq("muted_id", message.sender_id).in("muter_id", recipientIds),
      admin.from("push_tokens").select("id, token, user_id").in("user_id", recipientIds),
    ]);

    const suppressed = new Set([...(blocks ?? []).map((b) => b.blocker_id), ...(mutes ?? []).map((m) => m.muter_id)]);
    const targets = (tokenRows ?? []).filter((row) => !suppressed.has(row.user_id));
    if (!targets.length) return new Response(JSON.stringify({ sent: 0, reason: "no eligible tokens" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const senderName = sender?.display_name || sender?.username || "Someone";
    const isVoiceNote = message.content.startsWith("ako-voice-note:v1:");
    const body = isVoiceNote ? "Sent a voice note" : "Sent you a message";

    const notifications = targets.map((t) => ({
      to: t.token,
      title: senderName,
      body,
      sound: "default", // the phone's own notification sound (Android: set by the channel; iOS: this field)
      priority: "high", // wake a dozing device and allow a heads-up banner
      channelId: CHANNEL_MESSAGES,
      data: { type: "message", conversationId: message.conversation_id, messageId: message.id },
    }));

    const tickets: ExpoTicket[] = [];
    for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
      const batch = notifications.slice(i, i + BATCH_SIZE);
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(batch),
      });
      const parsed = await response.json().catch(() => null);
      if (Array.isArray(parsed?.data)) tickets.push(...(parsed.data as ExpoTicket[]));
      else console.error("send-message-push: unexpected Expo response", response.status, parsed);
    }

    // Tokens Expo already knows are dead are pruned now; every accepted ticket is stored so
    // check-push-receipts can read its receipt later. Any OTHER ticket error (InvalidCredentials = no
    // FCM key uploaded to EAS, MessageRateExceeded, ...) is logged loudly — it used to vanish silently.
    const deadTokenIds: string[] = [];
    const pendingTickets: { ticket_id: string; token: string }[] = [];
    const ticketErrors: Record<string, number> = {};
    tickets.forEach((ticket, index) => {
      const target = targets[index];
      if (!target) return;
      if (ticket.status === "error") {
        const reason = ticket.details?.error ?? "unknown";
        if (reason === "DeviceNotRegistered") deadTokenIds.push(target.id);
        else ticketErrors[reason] = (ticketErrors[reason] ?? 0) + 1;
      } else if (ticket.status === "ok" && ticket.id) pendingTickets.push({ ticket_id: ticket.id, token: target.token });
    });
    if (Object.keys(ticketErrors).length) console.error("send-message-push: Expo ticket errors", ticketErrors);
    if (deadTokenIds.length) await admin.from("push_tokens").delete().in("id", deadTokenIds);
    if (pendingTickets.length) await admin.from("push_tickets").upsert(pendingTickets, { onConflict: "ticket_id", ignoreDuplicates: true });

    return new Response(JSON.stringify({ sent: targets.length, accepted: pendingTickets.length, pruned: deadTokenIds.length, errors: ticketErrors }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("send-message-push error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
