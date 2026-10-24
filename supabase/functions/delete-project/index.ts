// ============================================================
// AKỌ — Edge Function: delete-project
// ============================================================
// True hard-delete for a project (unlike posts, which only ever
// soft-delete). Projects have no is_deleted column, and some child
// tables reference projects with the default RESTRICT behaviour
// (purchases, music licence acceptances, assignment submissions) —
// deleting a project that has those records would break history.
// In that case we return a clear 409 that says WHICH records block
// the delete and tells the owner to archive instead, rather than
// letting a raw FK error leak through or mislabelling every FK
// failure as "has purchases".
//
// v2: error messages are mapped per blocking table (v1 reported every
// foreign-key failure as a purchase problem).
//
// Deploy: supabase functions deploy delete-project
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

// Child table that blocked the delete -> what to tell the owner.
const BLOCKED_BY: Record<string, string> = {
  purchases: "This project has purchases on record and can't be deleted. Archive it instead to hide it.",
  music_catalogue_licence_acceptances:
    "People have accepted the licence for this music, and that record has to stay. Archive it instead to hide it.",
  assignment_submissions:
    "Students have submitted work for this project, and those submissions have to stay. Archive it instead to hide it.",
  // projects_parent_gig_id_fkey: a gig that still has songs under it (the blocking child is another projects row).
  projects: "This gig still has songs. Move or delete them first.",
};
const BLOCKED_DEFAULT =
  "This project is still linked to other records and can't be deleted yet. Archive it instead to hide it.";

function blockedMessage(message: string): string {
  // PostgREST: 'update or delete on table "projects" violates foreign key constraint "x" on table "purchases"'
  const m = /constraint "[^"]+" on table "([^"]+)"/.exec(message ?? "");
  const child = m?.[1];
  return (child && BLOCKED_BY[child]) || BLOCKED_DEFAULT;
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
    const { project_id } = await req.json();
    if (!project_id) {
      return jsonResponse({ error: "Missing project_id" }, 400);
    }

    const { data: project, error: fetchError } = await admin
      .from("projects")
      .select("id, owner_id")
      .eq("id", project_id)
      .single();

    if (fetchError || !project) {
      return jsonResponse({ error: "Project not found" }, 404);
    }
    if (project.owner_id !== user.id) {
      return jsonResponse({ error: "You can only delete your own projects" }, 403);
    }

    const { error: deleteError } = await admin
      .from("projects")
      .delete()
      .eq("id", project_id);

    if (deleteError) {
      // 23503 = foreign_key_violation — a RESTRICT child row blocks the delete.
      if (deleteError.code === "23503") {
        console.error("delete-project blocked by FK:", deleteError.message);
        return jsonResponse({ error: blockedMessage(deleteError.message), code: "blocked" }, 409);
      }
      throw deleteError;
    }

    return jsonResponse({ success: true }, 200);

  } catch (err) {
    console.error("delete-project error:", err);
    return jsonResponse({ error: "Failed to delete project" }, 500);
  }
});

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
