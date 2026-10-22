// ============================================================
// AKỌ — Edge Function: guest-pass-file
// ============================================================
// Serves a project's HOSTED files (uploads in the private-content bucket) to someone holding a valid Guest Pass
// link — signed in or not. verify_jwt is OFF on purpose: the pass token is the credential, and this function
// re-validates it on EVERY call (exists, not revoked, not expired, project still active).
//
// Each signed URL lives for min(1 hour, time left on the pass), so a link can never outlive its pass by more than the
// moments it takes a started download to finish. Unlike get-project-file this does not log download attempts or bump
// download_count: a pass is a preview/gift window, not a purchase or a counted download.
//
// Body: { token, kind: "file" | "audio" | "video" | "image" | "book", file_id?, all?, action?: "download" | "stream" }
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Deployed with verify_jwt = false.
// ============================================================

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_SIGNED_SECONDS = 60 * 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: object, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const { token, kind = "file", file_id, all, action = "download" } = await req.json();
    if (typeof token !== "string" || token.length < 16 || token.length > 64) return json({ error: "Invalid pass" }, 400);
    if (file_id != null && !UUID_RE.test(file_id)) return json({ error: "file_id is not valid" }, 400);
    if (!["file", "audio", "video", "image", "book"].includes(kind)) return json({ error: "Unsupported kind" }, 400);

    const { data: pass } = await admin
      .from("project_guest_passes")
      .select("project_id, expires_at, revoked_at")
      .eq("token", token)
      .maybeSingle();
    if (!pass) return json({ error: "Invalid pass" }, 404);
    if (pass.revoked_at) return json({ error: "This pass was revoked", code: "revoked" }, 410);

    const remainingSeconds = Math.floor((new Date(pass.expires_at).getTime() - Date.now()) / 1000);
    if (remainingSeconds <= 0) return json({ error: "This pass has expired", code: "expired" }, 410);
    const ttl = Math.min(MAX_SIGNED_SECONDS, remainingSeconds);

    const projectId: string = pass.project_id;
    const { data: project } = await admin
      .from("projects")
      .select("file_path, is_active, status")
      .eq("id", projectId)
      .maybeSingle();
    if (!project || !project.is_active || ["archived", "cancelled"].includes(project.status)) {
      return json({ error: "This project is no longer available", code: "unavailable" }, 410);
    }

    const sign = async (paths: string[]) => {
      const { data, error } = await admin.storage.from("private-content").createSignedUrls(paths, ttl);
      if (error || !data || data.length !== paths.length || data.some((s) => !s.signedUrl)) {
        throw error ?? new Error("Failed to sign URLs");
      }
      return data.map((s) => s.signedUrl);
    };

    if (kind === "file") {
      const { data: rows, error } = await admin
        .from("project_files")
        .select("id, file_path, download_name, size_bytes")
        .eq("project_id", projectId)
        .order("position", { ascending: true });
      if (error) throw error;
      let list: { id: string | null; file_path: string; download_name: string; size_bytes: number | null }[] = rows ?? [];
      if (list.length === 0 && project.file_path) {
        list = [{ id: null, file_path: project.file_path, download_name: String(project.file_path).split("/").pop() ?? "download", size_bytes: null }];
      }
      if (file_id) list = list.filter((f) => f.id === file_id);
      else if (!all) list = list.slice(0, 1);
      if (list.length === 0) return json({ error: "File not found" }, 404);
      const urls = await sign(list.map((f) => f.file_path));
      return json({
        expires_in: ttl,
        files: list.map((f, i) => ({ file_id: f.id, url: urls[i], file_name: f.download_name, size_bytes: f.size_bytes })),
      }, 200);
    }

    let path: string | null = null;
    if (kind === "audio" || kind === "video" || kind === "image") {
      const { data: media } = await admin
        .from("project_media_details")
        .select("audio_file_path, video_file_path, image_file_path")
        .eq("project_id", projectId)
        .maybeSingle();
      path = kind === "audio" ? media?.audio_file_path : kind === "video" ? media?.video_file_path : media?.image_file_path;
    } else if (kind === "book") {
      const { data: book } = await admin
        .from("project_book_details")
        .select("file_path, allow_download, allow_read_in_app")
        .eq("project_id", projectId)
        .maybeSingle();
      if (book) {
        // The creator's own book settings still apply to a guest.
        if (action === "download" && !book.allow_download) return json({ error: "Download is not enabled for this book" }, 403);
        if (action === "stream" && !book.allow_read_in_app) return json({ error: "In-app reading is not enabled for this book" }, 403);
        path = book.file_path;
      }
    }
    if (!path) return json({ error: "This project has no hosted file of that kind" }, 404);

    const [url] = await sign([path]);
    return json({ url, expires_in: ttl }, 200);
  } catch (err) {
    console.error("guest-pass-file error:", err);
    return json({ error: "Failed to generate file access" }, 500);
  }
});
