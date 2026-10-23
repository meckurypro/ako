// File: supabase/functions/sync-exchange-rate/index.ts
// Fetches the live USD->NGN market rate from exchangerate-api.com and applies it through
// apply_market_rate(), which keeps the admin's deposit/withdrawal spread. A pg_cron job calls this
// every 6 hours (secret in `x-webhook-secret`, verify_jwt OFF, same scheme as check-push-receipts).
//
// Secret required (Supabase > Edge Functions > Secrets):  EXCHANGE_RATE_API_KEY
import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: authorised, error: secretError } = await admin.rpc("verify_push_webhook_secret", {
    p_secret: req.headers.get("x-webhook-secret"),
  });
  if (secretError || authorised !== true) return json({ error: "Unauthorized" }, 401);

  const recordFailure = async (message: string) => {
    console.error("sync-exchange-rate:", message);
    await admin
      .from("exchange_rate_settings")
      .update({ last_status: `error: ${message}`.slice(0, 300), last_attempt_at: new Date().toISOString() })
      .eq("id", true);
  };

  const apiKey = Deno.env.get("EXCHANGE_RATE_API_KEY");
  if (!apiKey) {
    await recordFailure("EXCHANGE_RATE_API_KEY secret is not set");
    return json({ error: "EXCHANGE_RATE_API_KEY not set" }, 500);
  }

  try {
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/USD/NGN`, {
      signal: AbortSignal.timeout(10_000),
    });
    const body = await response.json().catch(() => null);
    const market = Number(body?.conversion_rate);

    if (!response.ok || body?.result !== "success" || !Number.isFinite(market) || market <= 0) {
      await recordFailure(`exchangerate-api: ${body?.["error-type"] ?? `HTTP ${response.status}`}`);
      return json({ error: "Rate fetch failed" }, 502);
    }

    const { data, error } = await admin.rpc("apply_market_rate", { p_market: market });
    if (error) {
      await recordFailure(`apply_market_rate: ${error.message}`);
      return json({ error: "Apply failed" }, 500);
    }
    return json(data);
  } catch (err) {
    await recordFailure(err instanceof Error ? err.message : "unknown error");
    return json({ error: "Sync failed" }, 500);
  }
});
