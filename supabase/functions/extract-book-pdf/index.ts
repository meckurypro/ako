// ============================================================
// AKỌ — Edge Function: extract-book-pdf
// ============================================================
// Turns an uploaded PDF book (project_book_details.content_source = 'upload') into reflowable chapters in
// `book_chapters`, so it reads in the same in-app reader as a book written in Akọ — on web AND native — instead of
// as page images. The PDF stays in storage (Download is unaffected).
//
// Chapters come from, in order: the PDF's own outline (bookmarks) -> "Chapter N" / large headings found in the text
// -> fixed runs of pages. Running headers/footers and page numbers are dropped. A PDF with no text layer (scans)
// returns { ok: false, reason: "no_text" } and writes nothing — the client keeps its page-image fallback.
//
// Body: { project_id: string, force?: boolean }
//   force omitted/false: if the book already has chapters, returns them untouched (idempotent — safe to call on open).
//   force true: replaces the extracted chapters (use for "Re-extract").
//
// Caller must own the project (owner_id = auth user), same rule as delete-project.
// Limits: PDFs over 60 MB or 1200 pages are refused. Supabase caps an edge request at ~2 s of CPU; a plain-text book of
// a few hundred pages measured ~1.5 s locally, so very long or heavily-typeset PDFs may time out (the client treats any
// failure as "keep using the page-image reader").
//
// Deploy: supabase functions deploy extract-book-pdf   (verify_jwt on)
// Secrets required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDocumentProxy } from "npm:unpdf@0.12.1";
import { extractChapters } from "./extract.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const MAX_BYTES = 60 * 1024 * 1024;

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "Invalid or expired session" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const { project_id, force } = await req.json();
    if (!project_id || typeof project_id !== "string") return json({ error: "Missing project_id" }, 400);

    const { data: project } = await admin.from("projects").select("id, owner_id, project_type").eq("id", project_id).maybeSingle();
    if (!project) return json({ error: "Project not found" }, 404);
    if (project.owner_id !== user.id) return json({ error: "You can only do this for your own books" }, 403);
    if (project.project_type !== "book") return json({ error: "Not a book" }, 400);

    const { data: details } = await admin
      .from("project_book_details")
      .select("content_source, file_path")
      .eq("project_id", project_id)
      .maybeSingle();
    if (!details || details.content_source !== "upload" || !details.file_path) {
      return json({ error: "This book has no uploaded PDF" }, 400);
    }

    const { count: existing } = await admin
      .from("book_chapters")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project_id);
    if ((existing ?? 0) > 0 && !force) return json({ ok: true, already: true, chapters: existing });

    const { data: blob, error: dlError } = await admin.storage.from("private-content").download(details.file_path);
    if (dlError || !blob) return json({ error: "Couldn't read the uploaded file" }, 404);
    if (blob.size > MAX_BYTES) return json({ ok: false, reason: "too_large" });

    const pdf = await getDocumentProxy(new Uint8Array(await blob.arrayBuffer()));
    const result = await extractChapters(pdf);

    // Always record the page count — it's shown on the book card before anyone opens the reader.
    if (result.pageCount > 0) {
      await admin.from("project_book_details").update({ page_count: result.pageCount }).eq("project_id", project_id);
    }
    if (!result.ok) return json({ ok: false, reason: result.reason ?? "no_text", pages: result.pageCount });

    // Replace in one go: delete, then insert in small batches (chapter text can be large).
    const { error: delError } = await admin.from("book_chapters").delete().eq("project_id", project_id);
    if (delError) throw delError;
    const rows = result.chapters.map((c, i) => ({
      project_id,
      kind: c.kind,
      title: c.title,
      content: c.content,
      sort_order: i,
    }));
    for (let i = 0; i < rows.length; i += 10) {
      const { error } = await admin.from("book_chapters").insert(rows.slice(i, i + 10));
      if (error) throw error;
    }

    return json({ ok: true, chapters: rows.length, strategy: result.strategy, pages: result.pageCount });
  } catch (err) {
    console.error("extract-book-pdf error:", err);
    return json({ error: "Couldn't process this PDF" }, 500);
  }
});
