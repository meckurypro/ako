// ============================================================
// AKỌ — Edge Function: ocr-book-pdf
// ============================================================
// Makes a scanned / image-only PDF book reflowable. `extract-book-pdf` returns reason "no_text" for those (nothing to
// read in the PDF itself); this function reads the pages with an OCR provider and writes the same `book_chapters`
// rows, so the book then opens in the normal reader on web AND native instead of as page images.
//
// Why it is built this way
//   - OCR of a long book takes minutes; an edge request can't. So `start` creates a job row and returns at once, the
//     work runs in the background (EdgeRuntime.waitUntil), saves every batch of pages (book_ocr_pages), and when its
//     time budget runs out it re-invokes itself with the service-role key to carry on. A crash or a stale chain is
//     resumed by calling `start` again — finished batches are never paid for twice.
//   - The provider fetches the PDF from a short-lived signed URL (nothing large passes through this function) and
//     is asked for a page range at a time.
//   - Progress is the book_ocr_jobs row (owner-readable); the app polls it.
//   - OCR text is untrusted: ocrChapters.ts strips images/links/HTML before anything is stored.
//   - Cost is bounded: owner-only, one job per book, at most 2 running jobs per owner, ≤ 600 pages, ≤ 50 MB.
//
// Body (user JWT):   { project_id: string, force?: boolean }
//   -> { ok: true, status: "running", total_pages }                    started or already running
//   -> { ok: true, already: true }                                     chapters exist and force wasn't set
//   -> { ok: false, reason: "ocr_unavailable" | "too_large" | "busy" }
// Body (service role, internal only):  { project_id, continue: true }
//
// Deploy: supabase functions deploy ocr-book-pdf   (verify_jwt on)
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, MISTRAL_API_KEY
//          (without MISTRAL_API_KEY the function answers { ok: false, reason: "ocr_unavailable" } and does nothing)
// ============================================================

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chaptersFromOcrPages } from "./ocrChapters.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
const OCR_MODEL = Deno.env.get("OCR_MODEL") ?? "mistral-ocr-latest";

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_PAGES = 600;
const MAX_RUNNING_PER_OWNER = 2;
const BATCH_PAGES = 20;
const RUN_BUDGET_MS = 50_000; // stop starting batches after this (a batch can take up to ~90 s; the platform kills a background task at 150 s), then hand over to a fresh invocation
const LEASE_MS = 180_000; // one worker per job at a time
const STALE_MS = 5 * 60_000; // a "running" job nobody has touched for this long is resumed by the next start

class OcrError extends Error {
  constructor(public code: string, detail: string) {
    super(detail);
  }
}

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const iso = (ms: number) => new Date(ms).toISOString();

// ---------------------------------------------------------------- provider

async function ocrPages(documentUrl: string, indexes: number[]): Promise<string[]> {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= 4; attempt++) {
    let res: Response;
    try {
      res = await fetch("https://api.mistral.ai/v1/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${MISTRAL_API_KEY}` },
        body: JSON.stringify({
          model: OCR_MODEL,
          document: { type: "document_url", document_url: documentUrl },
          pages: indexes,
          include_image_base64: false,
        }),
        signal: AbortSignal.timeout(90_000),
      });
    } catch (err) {
      console.error("ocr fetch failed", attempt, (err as Error).name);
      if (attempt === 4) throw new OcrError("ocr_failed", "network");
      await sleep(1500 * attempt);
      continue;
    }
    lastStatus = res.status;
    if (res.ok) {
      const data = await res.json();
      const pages: { index?: number; markdown?: string }[] = Array.isArray(data?.pages) ? data.pages : [];
      // Results come back in the order requested; fall back to the index field if the count differs.
      if (pages.length === indexes.length) return pages.map((p) => String(p.markdown ?? ""));
      const byIndex = new Map(pages.map((p) => [p.index, String(p.markdown ?? "")]));
      return indexes.map((i) => byIndex.get(i) ?? "");
    }
    const body = (await res.text().catch(() => "")).slice(0, 300);
    console.error("ocr provider error", res.status, body);
    if (res.status === 401 || res.status === 403) throw new OcrError("ocr_auth", "provider rejected the key");
    if (res.status === 402) throw new OcrError("ocr_quota", "provider quota");
    if (res.status === 400 || res.status === 413 || res.status === 422) throw new OcrError("ocr_bad_document", `status ${res.status}`);
    if (res.status === 429 || res.status >= 500) {
      if (attempt === 4) break;
      const wait = Number(res.headers.get("retry-after")) || 2 * attempt;
      await sleep(Math.min(wait, 20) * 1000);
      continue;
    }
    throw new OcrError("ocr_failed", `status ${res.status}`);
  }
  throw new OcrError(lastStatus === 429 ? "ocr_quota" : "ocr_failed", `status ${lastStatus}`);
}

// ---------------------------------------------------------------- worker

async function releaseLease(admin: SupabaseClient, projectId: string) {
  await admin.from("book_ocr_jobs").update({ lease_until: null, updated_at: iso(Date.now()) }).eq("project_id", projectId);
}

async function fail(admin: SupabaseClient, projectId: string, code: string) {
  await admin
    .from("book_ocr_jobs")
    .update({ status: "failed", error_code: code, lease_until: null, updated_at: iso(Date.now()) })
    .eq("project_id", projectId);
}

async function selfContinue(projectId: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/ocr-book-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY },
      body: JSON.stringify({ project_id: projectId, continue: true }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    // The job stays "running" with its lease released; the owner's next start resumes it.
    console.error("self-continue failed", (err as Error).name);
  }
}

async function work(admin: SupabaseClient, projectId: string) {
  const started = Date.now();
  try {
    // Claim the job: only if running and nobody holds a live lease.
    const { data: claimed } = await admin
      .from("book_ocr_jobs")
      .update({ lease_until: iso(started + LEASE_MS), updated_at: iso(started) })
      .eq("project_id", projectId)
      .eq("status", "running")
      .or(`lease_until.is.null,lease_until.lt.${iso(started)}`)
      .select("project_id, total_pages, next_page")
      .maybeSingle();
    if (!claimed) return;

    const { data: details } = await admin.from("project_book_details").select("file_path").eq("project_id", projectId).maybeSingle();
    if (!details?.file_path) return fail(admin, projectId, "no_file");
    const { data: signed, error: signError } = await admin.storage.from("private-content").createSignedUrl(details.file_path, 3600);
    if (signError || !signed?.signedUrl) return fail(admin, projectId, "no_file");

    let next: number = claimed.next_page;
    const total: number = claimed.total_pages;
    while (next < total) {
      if (Date.now() - started > RUN_BUDGET_MS) {
        await releaseLease(admin, projectId);
        await selfContinue(projectId);
        return;
      }
      const to = Math.min(next + BATCH_PAGES, total);
      const indexes = Array.from({ length: to - next }, (_, i) => next + i);
      const markdown = await ocrPages(signed.signedUrl, indexes);
      const rows = indexes.map((page_index, i) => ({ project_id: projectId, page_index, markdown: markdown[i] ?? "" }));
      const { error: upErr } = await admin.from("book_ocr_pages").upsert(rows, { onConflict: "project_id,page_index" });
      if (upErr) throw upErr;
      next = to;
      await admin
        .from("book_ocr_jobs")
        .update({ next_page: next, lease_until: iso(Date.now() + LEASE_MS), updated_at: iso(Date.now()) })
        .eq("project_id", projectId);
    }

    // All pages read: build chapters and replace the book's text.
    const { data: pageRows, error: readErr } = await admin
      .from("book_ocr_pages")
      .select("page_index, markdown")
      .eq("project_id", projectId)
      .order("page_index", { ascending: true })
      .limit(MAX_PAGES + 1);
    if (readErr) throw readErr;
    const pages: string[] = Array.from({ length: total }, () => "");
    for (const r of pageRows ?? []) if (r.page_index < total) pages[r.page_index] = r.markdown ?? "";

    const built = chaptersFromOcrPages(pages);
    if (!built.ok) return fail(admin, projectId, "no_text");

    const { error: delError } = await admin.from("book_chapters").delete().eq("project_id", projectId);
    if (delError) throw delError;
    const chapterRows = built.chapters.map((c, i) => ({ project_id: projectId, kind: c.kind, title: c.title, content: c.content, sort_order: i }));
    for (let i = 0; i < chapterRows.length; i += 10) {
      const { error } = await admin.from("book_chapters").insert(chapterRows.slice(i, i + 10));
      if (error) throw error;
    }
    await admin.from("project_book_details").update({ page_count: total }).eq("project_id", projectId);
    await admin
      .from("book_ocr_jobs")
      .update({ status: "done", chapters_count: chapterRows.length, error_code: null, lease_until: null, updated_at: iso(Date.now()) })
      .eq("project_id", projectId);
    // The text now lives in book_chapters (access-gated); don't keep a second, ungated copy.
    await admin.from("book_ocr_pages").delete().eq("project_id", projectId);
  } catch (err) {
    console.error("ocr-book-pdf worker error:", err instanceof OcrError ? `${err.code}: ${err.message}` : err);
    await fail(admin, projectId, err instanceof OcrError ? err.code : "ocr_failed");
  }
}

function background(p: Promise<unknown>) {
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime) EdgeRuntime.waitUntil(p);
  else p.catch(() => {});
}

// ---------------------------------------------------------------- handler

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);
  const bearer = authHeader.replace(/^Bearer\s+/i, "");
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const projectId = body?.project_id;
    if (!projectId || typeof projectId !== "string") return json({ error: "Missing project_id" }, 400);

    // Internal continuation from a previous invocation of this same function.
    if (body.continue === true) {
      if (!safeEqual(bearer, SERVICE_ROLE_KEY)) return json({ error: "Forbidden" }, 403);
      background(work(admin, projectId));
      return json({ ok: true });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Invalid or expired session" }, 401);

    const { data: project } = await admin.from("projects").select("id, owner_id, project_type").eq("id", projectId).maybeSingle();
    if (!project) return json({ error: "Project not found" }, 404);
    if (project.owner_id !== user.id) return json({ error: "You can only do this for your own books" }, 403);
    if (project.project_type !== "book") return json({ error: "Not a book" }, 400);

    const { data: details } = await admin
      .from("project_book_details")
      .select("content_source, file_path, page_count")
      .eq("project_id", projectId)
      .maybeSingle();
    if (!details || details.content_source !== "upload" || !details.file_path) return json({ error: "This book has no uploaded PDF" }, 400);

    if (!MISTRAL_API_KEY) return json({ ok: false, reason: "ocr_unavailable" });

    const force = body.force === true;
    const { count: existing } = await admin.from("book_chapters").select("id", { count: "exact", head: true }).eq("project_id", projectId);
    if ((existing ?? 0) > 0 && !force) return json({ ok: true, already: true, chapters: existing });

    // A job already in flight (or stalled): resume it, never start a second one.
    const { data: job } = await admin.from("book_ocr_jobs").select("*").eq("project_id", projectId).maybeSingle();
    if (job?.status === "running") {
      const idle = Date.now() - new Date(job.updated_at).getTime();
      if (idle > STALE_MS) background(work(admin, projectId));
      return json({ ok: true, status: "running", total_pages: job.total_pages, next_page: job.next_page });
    }

    const { count: running } = await admin
      .from("book_ocr_jobs")
      .select("project_id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("status", "running");
    if ((running ?? 0) >= MAX_RUNNING_PER_OWNER) return json({ ok: false, reason: "busy" });

    // Size and page limits, before any money is spent.
    const { data: signed } = await admin.storage.from("private-content").createSignedUrl(details.file_path, 300);
    if (!signed?.signedUrl) return json({ error: "Couldn't read the uploaded file" }, 404);
    const head = await fetch(signed.signedUrl, { method: "HEAD" }).catch(() => null);
    const size = Number(head?.headers.get("content-length") ?? 0);
    if (size > MAX_BYTES) return json({ ok: false, reason: "too_large" });

    let totalPages: number | null = details.page_count;
    if (!totalPages) {
      const { getDocumentProxy } = await import("npm:unpdf@0.12.1");
      const blob = await (await fetch(signed.signedUrl)).arrayBuffer();
      totalPages = (await getDocumentProxy(new Uint8Array(blob))).numPages;
    }
    if (!totalPages || totalPages > MAX_PAGES) return json({ ok: false, reason: "too_large" });

    await admin.from("book_ocr_pages").delete().eq("project_id", projectId);
    const { error: upErr } = await admin.from("book_ocr_jobs").upsert(
      {
        project_id: projectId,
        owner_id: user.id,
        status: "running",
        total_pages: totalPages,
        next_page: 0,
        chapters_count: null,
        error_code: null,
        lease_until: null,
        created_at: iso(Date.now()),
        updated_at: iso(Date.now()),
      },
      { onConflict: "project_id" }
    );
    if (upErr) throw upErr;

    background(work(admin, projectId));
    return json({ ok: true, status: "running", total_pages: totalPages, next_page: 0 });
  } catch (err) {
    console.error("ocr-book-pdf error:", err);
    return json({ error: "Couldn't start reading this PDF" }, 500);
  }
});
