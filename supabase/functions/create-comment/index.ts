// ============================================================
// AKỌ — Edge Function: create-comment
// ============================================================
// The ONLY way a comment gets created. Direct client inserts into
// `comments` are blocked at the RLS level (see migration 10).
//
// UPDATED — probational partial access: commenting is now gated
// per-feature via fn_can_access_feature('probational_comment_enabled',
// uid) rather than the old all-or-nothing fn_can_access_app.
// Approved accounts always pass; a pending (probational) account
// passes only if an admin has turned the "Commenting (probational)"
// flag on from Admin > Feature flags; declined/suspended accounts
// never pass.
//
// NEW — client_request_id (idempotency). Optional UUID chosen by the client and resent on every retry
// of the same logical comment (the mobile outbox does this for comments written offline). A repeat of
// (author, client_request_id) returns the comment that already exists (HTTP 200, `deduplicated: true`)
// and does nothing else: no second moderation call, no second insert. Backed by the partial unique
// index comments_author_client_request_id_key, which also settles two concurrent identical requests:
// the loser gets 23505 and returns the winner's row. Requests without the field behave exactly as
// before.
//
// UPDATED — stances are support | pushback | question. A comment with no stance (or the retired "comment") is stored
// as "support" (Add); "disagree" (sent by older app builds) is stored as "pushback". See supabase/ako_stances_question_comment.sql.
//
// Deploy: supabase functions deploy create-comment
// Secrets required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
// ============================================================

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const VALID_STANCES = ["support", "pushback", "question"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CreateCommentRequest {
  post_id: string;
  parent_comment_id?: string;
  content: string;
  stance?: string;
  client_request_id?: string | null;
}

/** Absent or the retired "comment" -> "support" (Add); the retired "disagree" -> "pushback"; anything else must be a known stance. */
function resolveStance(raw: unknown): { stance: string } | { error: string } {
  if (raw === undefined || raw === null || raw === "") return { stance: "support" };
  if (raw === "comment") return { stance: "support" };
  if (raw === "disagree") return { stance: "pushback" };
  if (typeof raw === "string" && VALID_STANCES.includes(raw)) return { stance: raw };
  return { error: `stance must be one of: ${VALID_STANCES.join(", ")}` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing Authorization header" }, 401);
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: "Invalid or expired session" }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // --------------------------------------------------------
  // Probational partial-access gate — fail CLOSED on a check error
  // (don't let an unverifiable request through). See
  // fn_can_access_feature in the DB.
  // --------------------------------------------------------
  const { data: canAccess, error: gateError } = await admin.rpc("fn_can_access_feature", {
    p_feature_key: "probational_comment_enabled",
    p_user_id: user.id,
  });
  if (gateError) {
    console.error("create-comment gate check error:", gateError);
    return jsonResponse({ error: "Couldn't verify account access. Please try again." }, 503);
  }
  if (!canAccess) {
    return jsonResponse({ error: "Commenting isn't available on your account yet.", decision: "pending_review" }, 403);
  }

  try {
    const body: CreateCommentRequest = await req.json();
    const { post_id, parent_comment_id, content } = body;
    const clientRequestId = body.client_request_id ?? null;

    if (clientRequestId !== null && (typeof clientRequestId !== "string" || !UUID_RE.test(clientRequestId))) {
      return jsonResponse({ error: "Invalid client_request_id" }, 400);
    }

    if (!post_id) {
      return jsonResponse({ error: "post_id is required" }, 400);
    }
    if (!content?.trim()) {
      return jsonResponse({ error: "Content cannot be empty" }, 400);
    }
    if (content.length > 2000) {
      return jsonResponse({ error: "Content exceeds 2000 character limit" }, 400);
    }
    const resolved = resolveStance(body.stance);
    if ("error" in resolved) {
      return jsonResponse({ error: resolved.error }, 400);
    }
    const stance = resolved.stance;

    // A repeat of an already-created comment: hand back the original before doing any other work.
    if (clientRequestId) {
      const existing = await findExistingComment(admin, user.id, clientRequestId);
      if (existing) return jsonResponse({ success: true, comment: existing, deduplicated: true }, 200);
    }

    const { data: post, error: postError } = await admin
      .from("posts")
      .select("id, is_deleted")
      .eq("id", post_id)
      .maybeSingle();

    if (postError || !post || post.is_deleted) {
      return jsonResponse({ error: "Post not found" }, 404);
    }

    if (parent_comment_id) {
      const { data: parent } = await admin
        .from("comments")
        .select("id, post_id, is_deleted")
        .eq("id", parent_comment_id)
        .maybeSingle();

      if (!parent || parent.is_deleted || parent.post_id !== post_id) {
        return jsonResponse({ error: "Parent comment not found on this post" }, 404);
      }
    }

    const modResponse = await fetch(`${SUPABASE_URL}/functions/v1/moderate-content`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: user.id,
        content_type: "comment",
        content,
      }),
    });

    const modResult = await modResponse.json();

    if (modResult.decision !== "allowed") {
      return jsonResponse({
        error: modResult.message ?? "This content can't be posted.",
        decision: modResult.decision,
      }, 422);
    }

    const { data: comment, error: insertError } = await admin
      .from("comments")
      .insert({
        post_id,
        parent_comment_id: parent_comment_id ?? null,
        author_id: user.id,
        content,
        stance,
        client_request_id: clientRequestId,
      })
      .select()
      .single();

    if (insertError) {
      if (clientRequestId && insertError.code === "23505") {
        const existing = await findExistingComment(admin, user.id, clientRequestId);
        if (existing) return jsonResponse({ success: true, comment: existing, deduplicated: true }, 200);
      }
      throw insertError;
    }

    return jsonResponse({ success: true, comment }, 201);

  } catch (err) {
    console.error("create-comment error:", err);
    return jsonResponse({ error: "Failed to create comment" }, 500);
  }
});

async function findExistingComment(
  admin: ReturnType<typeof createClient>,
  authorId: string,
  clientRequestId: string,
) {
  const { data } = await admin
    .from("comments")
    .select()
    .eq("author_id", authorId)
    .eq("client_request_id", clientRequestId)
    .maybeSingle();
  return data ?? null;
}

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
