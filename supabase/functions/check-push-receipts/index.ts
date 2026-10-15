// File: supabase/functions/check-push-receipts/index.ts
// Reads Expo push RECEIPTS. A send response only holds tickets ("Expo accepted this"); whether the
// push reached the device, and notably DeviceNotRegistered, arrives in the receipt a few minutes
// later. send-message-push and send-activity-push store each ok ticket in push_tickets; a pg_cron job
// calls this every 15 minutes (secret in `x-webhook-secret`, verify_jwt OFF, same scheme as
// send-activity-push).
//
// Per run: fetch receipts for tickets at least 15 minutes old, delete the push_tokens Expo says are
// dead, delete every ticket that got a receipt, and drop any ticket older than 24h (Expo only keeps
// receipts that long, so it will never resolve).
import { createClient } from "jsr:@supabase/supabase-js@2";

const RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
const RECEIPT_BATCH = 300; // Expo's documented max ids per request
const MIN_AGE_MS = 15 * 60_000;
const MAX_AGE_MS = 24 * 60 * 60_000;
const MAX_PER_RUN = 1000;

type Receipt = { status: "ok" | "error"; message?: string; details?: { error?: string } };

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
    const now = Date.now();
    const { data: tickets, error } = await admin
      .from("push_tickets")
      .select("ticket_id, token")
      .lt("created_at", new Date(now - MIN_AGE_MS).toISOString())
      .order("created_at", { ascending: true })
      .limit(MAX_PER_RUN);
    if (error) throw error;

    const rows = (tickets ?? []) as { ticket_id: string; token: string }[];
    const tokenByTicket = new Map(rows.map((r) => [r.ticket_id, r.token]));
    const resolved: string[] = [];
    const deadTokens = new Set<string>();
    const otherErrors: Record<string, number> = {};

    for (let i = 0; i < rows.length; i += RECEIPT_BATCH) {
      const ids = rows.slice(i, i + RECEIPT_BATCH).map((r) => r.ticket_id);
      const response = await fetch(RECEIPTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ids }),
      });
      const parsed = await response.json().catch(() => null);
      const receipts = parsed?.data as Record<string, Receipt> | undefined;
      if (!receipts) { console.error("check-push-receipts: unexpected Expo response", response.status, parsed); continue; }
      for (const [ticketId, receipt] of Object.entries(receipts)) {
        resolved.push(ticketId);
        if (receipt.status !== "error") continue;
        const reason = receipt.details?.error ?? "unknown";
        if (reason === "DeviceNotRegistered") {
          const token = tokenByTicket.get(ticketId);
          if (token) deadTokens.add(token);
        } else {
          // MessageTooBig, MessageRateExceeded, InvalidCredentials, ... — nothing to prune, but worth seeing in logs.
          otherErrors[reason] = (otherErrors[reason] ?? 0) + 1;
        }
      }
    }

    if (deadTokens.size) await admin.from("push_tokens").delete().in("token", [...deadTokens]);
    if (resolved.length) await admin.from("push_tickets").delete().in("ticket_id", resolved);
    await admin.from("push_tickets").delete().lt("created_at", new Date(now - MAX_AGE_MS).toISOString());
    if (Object.keys(otherErrors).length) console.error("check-push-receipts: receipt errors", otherErrors);

    return json({ checked: rows.length, resolved: resolved.length, pruned_tokens: deadTokens.size, other_errors: otherErrors });
  } catch (error) {
    console.error("check-push-receipts error:", error);
    return json({ error: String(error) }, 500);
  }
});
