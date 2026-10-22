// supabase/functions/create-page-comment/index.ts

// ============================================================
// AKỌ — Edge Function: create-page-comment
// ============================================================
// The Page-mode counterpart to create-comment, same relationship as
// create-page-post has to create-post. Comments created here are
// attributed to the page via comments.posted_as_page_id — author_id
// is still the real human who wrote it (and is still exactly who any
// gift on this comment credits, see process-gift and GiftsReceived on
// the frontend — posted_as_page_id is display/attribution only and is
// never read for gift routing), but every byline reads
// posted_as_page_id when it's set and shows the page instead
// (see useComments.ts / CommentThread.tsx).
//
// Flow mirrors create-comment, with one addition — a page-permission
// check — mirroring create-page-post:
//   1. Verify caller identity from their own JWT
//   2. Verify the caller is an ACTIVE member of the page who holds the
//      "comment" permission (admins always do; other members only if an
//      admin granted it — see has_page_permission)
//   3. Confirm the post (and parent comment, if replying) exist
//   4. Call moderate-content internally
//   5. If allowed: insert via service role
//   6. If blocked/held: return the message, nothing is created
//
// Notifications and counters (comment_count, stance counts,
// reply_count) are handled automatically by the same DB triggers
// create-comment relies on — those fire on any successful insert
// regardless of which function performed it, so nothing extra is
// needed here for that.
//
// UPDATED — stances are support | pushback | question. A comment with no stance (or the retired "comment") is stored
// as "support" (Add); "disagree" (sent by older app builds) is stored as "pushback".
//
// CORS: called directly from the browser/app
// (useComments.ts -> supabase.functions.invoke("create-page-comment")),
// so it must handle the OPTIONS preflight and return CORS headers on
// every response.
//
// Deploy: supabase functions deploy create-page-comment
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
const MAX_CONTENT_LENGTH = 2000; // matches comments.content's CHECK constraint

interface CreatePageCommentRequest {
  page_id: string;
  post_id: string;
  parent_comment_id?: string; // present when replying to another comment
  content: string;
  stance?: string; // absent = "support" (Add)
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

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: "Invalid or expired session" }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const body: CreatePageCommentRequest = await req.json();
    const { page_id, post_id, parent_comment_id, content } = body;

    if (!page_id) {
      return jsonResponse({ error: "page_id is required" }, 400);
    }
    if (!post_id) {
      return jsonResponse({ error: "post_id is required" }, 400);
    }
    if (!content?.trim()) {
      return jsonResponse({ error: "Content cannot be empty" }, 400);
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return jsonResponse({ error: `Content exceeds ${MAX_CONTENT_LENGTH} character limit` }, 400);
    }
    const resolved = resolveStance(body.stance);
    if ("error" in resolved) {
      return jsonResponse({ error: resolved.error }, 400);
    }
    const stance = resolved.stance;

    // --------------------------------------------------------
    // Confirm the page exists/is active, and that the caller is an
    // ACTIVE member holding the "comment" permission.
    // --------------------------------------------------------
    const { data: page, error: pageError } = await admin
      .from("pages")
      .select("id, is_active")
      .eq("id", page_id)
      .maybeSingle();

    if (pageError || !page || !page.is_active) {
      return jsonResponse({ error: "Page not found" }, 404);
    }

    const { data: allowed, error: permError } = await admin.rpc("has_page_permission", {
      p_page_id: page_id,
      p_perm: "comment",
      p_user_id: user.id,
    });

    if (permError || !allowed) {
      return jsonResponse({ error: "You don't have permission to comment as this page" }, 403);
    }

    // --------------------------------------------------------
    // Confirm the post exists and is visible before allowing a
    // comment on it (also catches typo'd/deleted post_id early) —
    // same check create-comment runs.
    // --------------------------------------------------------
    const { data: post, error: postError } = await admin
      .from("posts")
      .select("id, is_deleted")
      .eq("id", post_id)
      .maybeSingle();

    if (postError || !post || post.is_deleted) {
      return jsonResponse({ error: "Post not found" }, 404);
    }

    // If replying to a specific comment, confirm it exists and
    // belongs to the same post (prevents cross-post thread confusion)
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

    // --------------------------------------------------------
    // Moderate BEFORE anything is written — same internal call
    // create-comment/create-page-post make.
    // --------------------------------------------------------
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
      return jsonResponse(
        {
          error: modResult.message ?? "This content can't be posted.",
          decision: modResult.decision,
        },
        422
      );
    }

    // --------------------------------------------------------
    // Insert the comment attributed to the page (service role
    // bypasses RLS by design — comments.posted_as_page_id has no
    // client-writable path, this function is the only way it ever
    // gets set, same as posts.posted_as_page_id via create-page-post).
    // author_id stays the real human — this is who process-gift
    // credits and who counters/notifications triggers key off, same
    // as a plain comment.
    // --------------------------------------------------------
    const { data: comment, error: insertError } = await admin
      .from("comments")
      .insert({
        post_id,
        parent_comment_id: parent_comment_id ?? null,
        author_id: user.id,
        posted_as_page_id: page_id,
        content,
        stance,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return jsonResponse({ success: true, comment }, 201);
  } catch (err) {
    console.error("create-page-comment error:", err);
    return jsonResponse({ error: "Failed to create comment" }, 500);
  }
});

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
