// supabase/functions/update-comment/index.ts

// ============================================================
// AKỌ — Edge Function: update-comment
// ============================================================
// Edits a comment's text. Allowed only for the comment's author, and
// only until ANYONE engages with it (a like/dislike, a reply, or a
// gift). Deleting is separate and always allowed (soft delete from the
// client — see useDeleteComment).
//
// Re-moderates the new text exactly like create-comment, since an edit
// can introduce a violation as easily as the original could. Direct
// client writes to comments.content are refused by the
// comments_enforce_edit_rules trigger, so this is the only way in; the
// same trigger re-checks engagement as the final backstop.
//
// Deploy: supabase functions deploy update-comment
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

const CONTENT_LIMIT = 2000; // same cap as create-comment
const ENGAGED_MESSAGE = "This comment can't be edited — someone has already engaged with it.";

interface UpdateCommentRequest {
  comment_id: string;
  content: string;
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

  try {
    const body: UpdateCommentRequest = await req.json();
    const comment_id = body.comment_id;
    const content = body.content?.trim() ?? "";

    if (!comment_id) {
      return jsonResponse({ error: "Missing comment_id" }, 400);
    }
    if (!content) {
      return jsonResponse({ error: "Content cannot be empty" }, 400);
    }
    if (content.length > CONTENT_LIMIT) {
      return jsonResponse({ error: `Content exceeds ${CONTENT_LIMIT} character limit` }, 400);
    }

    const { data: existing, error: fetchError } = await admin
      .from("comments")
      .select("id, author_id, content, is_deleted")
      .eq("id", comment_id)
      .maybeSingle();

    if (fetchError || !existing) {
      return jsonResponse({ error: "Comment not found" }, 404);
    }
    if (existing.author_id !== user.id) {
      return jsonResponse({ error: "You can only edit your own comments" }, 403);
    }
    if (existing.is_deleted) {
      return jsonResponse({ error: "This comment has been deleted" }, 410);
    }
    if (existing.content === content) {
      return jsonResponse({ success: true, unchanged: true }, 200);
    }

    const { data: engaged, error: engagedError } = await admin.rpc("comment_has_engagement", {
      p_comment_id: comment_id,
    });
    if (engagedError) {
      console.error("update-comment engagement check error:", engagedError);
      return jsonResponse({ error: "Couldn't check this comment. Please try again." }, 503);
    }
    if (engaged) {
      return jsonResponse({ error: ENGAGED_MESSAGE, code: "engaged" }, 422);
    }

    const modResponse = await fetch(`${SUPABASE_URL}/functions/v1/moderate-content`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: user.id, content_type: "comment", content }),
    });
    const modResult = await modResponse.json();

    if (modResult.decision !== "allowed") {
      return jsonResponse({
        error: modResult.message ?? "This content can't be posted.",
        decision: modResult.decision,
      }, 422);
    }

    const { data: updated, error: updateError } = await admin
      .from("comments")
      .update({ content })
      .eq("id", comment_id)
      .select()
      .single();

    if (updateError) {
      // The DB trigger is the final backstop — surfaces here if someone
      // engaged between our check above and this write.
      if (updateError.message?.includes("engaged")) {
        return jsonResponse({ error: ENGAGED_MESSAGE, code: "engaged" }, 422);
      }
      throw updateError;
    }

    return jsonResponse({ success: true, comment: updated }, 200);

  } catch (err) {
    console.error("update-comment error:", err);
    return jsonResponse({ error: "Failed to update comment" }, 500);
  }
});

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
