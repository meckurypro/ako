// supabase/functions/update-post/index.ts

// ============================================================
// AKỌ — Edge Function: update-post
// ============================================================
// Edits a post's heading/content/category/media within the
// 7-day window (also enforced at the DB level by the
// posts_enforce_edit_window trigger — this function's own check
// is just a friendlier error message before the DB even sees it).
//
// Same heading+content rule as create-post: at least one of the
// two must be non-empty after the edit.
//
// Re-moderates the new text the same way create-post does, since
// an edit can just as easily introduce a violation as the original
// post could.
//
// Optional catalogue music: `music_catalogue_id` can be set,
// changed, or cleared (pass null) within the same edit window as
// everything else. Re-validated the same way create-post validates
// it, and the posts_validate_music_catalogue DB trigger fires on
// this UPDATE exactly as it does on INSERT.
//
// interest_ids (topics): passing interest_ids replaces the full set
// (replace-not-merge), while omitting the field leaves whatever
// topics the post already has untouched.
//
// heading_color: same optional named palette key create-post
// accepts (see src/lib/headingColors.ts). Always recomputed
// alongside heading on every edit.
//
// Deploy: supabase functions deploy update-post
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

const EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const EDIT_WINDOW_MESSAGE = "This post can no longer be edited (7-day window has passed)";
const HEADING_LIMIT = 50;
// Tiered: 450 for everyone, 1,200 for profiles.is_verified (the permanent admin-assigned status, NOT
// badge_visible). Keep in sync with create-post, src/lib/textLimits.ts and the posts_content_check
// DB constraint (the absolute ceiling, 1,200).
const STANDARD_CONTENT_LIMIT = 450;
const VERIFIED_CONTENT_LIMIT = 1200;

// Keep in sync with src/lib/headingColors.ts and the
// posts_heading_color_check DB constraint.
const HEADING_COLORS = [
  "sapphire", "emerald", "amber", "garnet", "amethyst", "petrol", "espresso", "graphite",
] as const;
type HeadingColor = (typeof HEADING_COLORS)[number];

interface UpdatePostRequest {
  post_id: string;
  heading?: string;
  content?: string;
  category_id?: string | null;
  media_urls?: string[];
  // Omit to leave topics untouched; pass an array (including an empty
  // one, to clear every topic) to replace the full set.
  interest_ids?: string[];
  // Optional — omit the field to leave music untouched, pass null to
  // remove it, or pass a published catalogue id to attach/change it.
  music_catalogue_id?: string | null;
  // Optional — omit or pass null for the default heading color.
  heading_color?: HeadingColor | null;
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
    const body: UpdatePostRequest = await req.json();
    const { post_id, category_id, media_urls, interest_ids } = body;
    const heading = body.heading?.trim() ?? "";
    const content = body.content?.trim() ?? "";
    const musicProvided = Object.prototype.hasOwnProperty.call(body, "music_catalogue_id");
    const musicCatalogueId = body.music_catalogue_id ?? null;
    const headingColor = body.heading_color ?? null;

    if (!post_id) {
      return jsonResponse({ error: "Missing post_id" }, 400);
    }
    if (!heading && !content) {
      return jsonResponse({ error: "Add a heading or some details before saving" }, 400);
    }
    if (heading.length > HEADING_LIMIT) {
      return jsonResponse({ error: `Heading exceeds ${HEADING_LIMIT} character limit` }, 400);
    }

    // Fail CLOSED — if the profile lookup errors, don't guess a limit.
    const { data: authorProfile, error: profileError } = await admin
      .from("profiles")
      .select("is_verified")
      .eq("id", user.id)
      .single();
    if (profileError || !authorProfile) {
      console.error("update-post profile lookup error:", profileError);
      return jsonResponse({ error: "Couldn't verify account details. Please try again." }, 503);
    }
    const contentLimit = authorProfile.is_verified ? VERIFIED_CONTENT_LIMIT : STANDARD_CONTENT_LIMIT;
    if (content.length > contentLimit) {
      return jsonResponse({ error: `Content exceeds ${contentLimit} character limit` }, 400);
    }
    if (headingColor !== null && !HEADING_COLORS.includes(headingColor)) {
      return jsonResponse({ error: "Invalid heading_color" }, 400);
    }

    const { data: existing, error: fetchError } = await admin
      .from("posts")
      .select("id, author_id, created_at, is_deleted")
      .eq("id", post_id)
      .single();

    if (fetchError || !existing) {
      return jsonResponse({ error: "Post not found" }, 404);
    }
    if (existing.author_id !== user.id) {
      return jsonResponse({ error: "You can only edit your own posts" }, 403);
    }
    if (existing.is_deleted) {
      return jsonResponse({ error: "This post has been deleted" }, 410);
    }

    const ageMs = Date.now() - new Date(existing.created_at).getTime();
    if (ageMs > EDIT_WINDOW_MS) {
      return jsonResponse({ error: EDIT_WINDOW_MESSAGE }, 422);
    }

    if (musicProvided && musicCatalogueId) {
      const { data: catalogueEntry } = await admin
        .from("music_catalogue")
        .select("id, publication_status")
        .eq("id", musicCatalogueId)
        .maybeSingle();
      if (!catalogueEntry || catalogueEntry.publication_status !== "published") {
        return jsonResponse({ error: "That song isn't available to attach right now" }, 400);
      }
    }

    const combinedText = [heading, content].filter(Boolean).join("\n\n");

    const modResponse = await fetch(`${SUPABASE_URL}/functions/v1/moderate-content`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: user.id, content_type: "post", content: combinedText }),
    });
    const modResult = await modResponse.json();

    if (modResult.decision !== "allowed") {
      return jsonResponse({
        error: modResult.message ?? "This content can't be posted.",
        decision: modResult.decision,
      }, 422);
    }

    const updatePayload: Record<string, unknown> = {
      heading: heading || null,
      heading_color: heading ? headingColor : null,
      content,
      category_id: category_id ?? null,
      media_urls: media_urls ?? [],
    };
    if (musicProvided) {
      updatePayload.music_catalogue_id = musicCatalogueId;
    }

    const { data: updated, error: updateError } = await admin
      .from("posts")
      .update(updatePayload)
      .eq("id", post_id)
      .select()
      .single();

    if (updateError) {
      // The DB trigger's own 7-day check is the final backstop —
      // surfaces here if the window closed between our check above
      // and this write (a rare race, but possible).
      if (updateError.message?.includes("7 days")) {
        return jsonResponse({ error: EDIT_WINDOW_MESSAGE }, 422);
      }
      throw updateError;
    }

    // --------------------------------------------------------
    // Replace topics, if the caller sent any (including an explicit
    // empty array, to clear them all) — omitting the field entirely
    // leaves existing post_topics rows untouched.
    // --------------------------------------------------------
    if (interest_ids !== undefined) {
      const { error: deleteError } = await admin.from("post_topics").delete().eq("post_id", post_id);
      if (deleteError) throw deleteError;

      if (interest_ids.length > 0) {
        const validInterests = await admin
          .from("interests")
          .select("id")
          .in("id", interest_ids)
          .eq("is_active", true);

        const topicRows = (validInterests.data ?? []).map((i: { id: string }) => ({
          post_id,
          interest_id: i.id,
        }));

        if (topicRows.length) {
          const { error: insertError } = await admin.from("post_topics").insert(topicRows);
          if (insertError) throw insertError;
        }
      }
    }

    if (musicProvided && musicCatalogueId) {
      await admin.from("music_catalogue_usage_events").insert({
        catalogue_id: musicCatalogueId,
        event_type: "post_attach",
        post_id: post_id,
        actor_id: user.id,
      });
    }

    return jsonResponse({ success: true, post: updated }, 200);

  } catch (err) {
    console.error("update-post error:", err);
    return jsonResponse({ error: "Failed to update post" }, 500);
  }
});

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
