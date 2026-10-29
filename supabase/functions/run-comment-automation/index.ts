// supabase/functions/run-comment-automation/index.ts
//
// AKỌ — Edge Function: run-comment-automation. The commenting half of the automated accounts. Admin only; never
// reachable by ordinary users. Tables, queue and claim function: supabase/ako_automation_comments.sql.
//
// Two things make an automated account comment:
//   DAILY COMMENT  pg_cron -> tick. An account with a daily comment time gets a slot; it picks a random recent post by
//                  someone else it has not commented on yet (once every post is covered, a comment under someone's
//                  comment), reads it, and writes one short comment in the stance the admin chose.
//   REPLY          a database trigger queues a reply when someone comments on an automated account's post or under one
//                  of its comments, due a random number of minutes later (the admin sets the range). The comment is
//                  the trigger; this function reads it against the post and the thread and answers.
//                  Who is answering whom decides what happens (the database enforces the caps, see
//                  supabase/ako_automation_bot_rules.sql):
//                    reply  a person commented. Reply, or only like it when it repeats what the account already said.
//                    close  another automated account commented on this account's post. One closing reply (no question,
//                           nothing that invites an answer), or a like.
//                    react  another automated account replied under this account's comment. No reply back, only a like
//                           or a dislike, and the thread ends there.
//
// Modes
//   tick         pg_cron (every minute, only when something is due), authenticated with the shared secret in
//                `x-webhook-secret`. Claims due work through automation_claim_due_comments() and runs it in the
//                background (202 straight away).
//   preview      admin JWT. Writes a comment for { account_id, post_id? } and returns it. Posts nothing.
//   comment_now  admin JWT. Writes AND posts a comment for { account_id, post_id? } now. Recorded as a manual run.
//
// Pipeline per job: load account + key -> choose the target -> the account's AI provider (see llm.ts) -> validate
// against the permanent voice rules in voice.ts (retry with the problems listed) -> moderation, same gate as a
// comment written by a person -> insert the comment as the automated account.
//
// Idempotency: the comment is inserted with client_request_id = the log row id, so a retry of the same job returns
// the comment that already exists instead of posting twice.
//
// verify_jwt: OFF (the function authenticates itself: shared secret for cron, admin_roles check for the admin UI).
// Secrets required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (both provided by Supabase).
// Deploy: supabase functions deploy run-comment-automation --no-verify-jwt

import { createClient } from "jsr:@supabase/supabase-js@2";
import { callProvider, DEFAULT_MODELS, isProvider, LlmError, type Provider } from "./llm.ts";
import {
  isEcho,
  buildCommentUserMessage,
  buildReplyUserMessage,
  buildSystemPrompt,
  checkComment,
  chooseStance,
  type PostView,
  type Stance,
  type StanceSetting,
  type ThreadMessage,
} from "./voice.ts";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ATTEMPTS = 3; // writing attempts per target (a rejected draft is rewritten with the problems listed)
const MAX_TARGETS = 3; // targets tried for one daily comment when the model skips or cannot write one
const MAX_RUNS = 3; // times a job is retried after a temporary AI or network failure

class RunError extends Error {}
/** The job finished without posting, and that is fine (nothing to comment on, or not worth a comment). */
class Outcome extends Error {
  constructor(public status: "nothing_to_comment" | "skipped", message: string) {
    super(message);
  }
}

interface AccountRow {
  id: string;
  user_id: string;
  system_prompt: string;
  comment_stance: StanceSetting;
  comment_max_chars: number;
  comment_voice: string;
  ai: { provider: Provider; model: string; apiKey: string };
  displayName: string;
  username: string;
}

interface LogRow {
  id: string;
  account_id: string;
  kind: "comment" | "reply";
  trigger: "schedule" | "manual" | "reply";
  status: string;
  post_id: string | null;
  source_comment_id: string | null;
  attempts: number;
}

interface Target {
  /** post / under_comment: a daily comment. reply / close / react: answering a comment (see the header). */
  mode: "post" | "under_comment" | "reply" | "close" | "react";
  postId: string;
  post: PostView;
  parentCommentId: string | null;
  /** under_comment / reply: the comment being answered, and the thread leading to it (oldest first). */
  thread: ThreadMessage[];
  existing: string[];
  /** reply targets: the post is the account's own. */
  ownPost?: boolean;
  /** reply targets: what the account already said (its thread messages, and its post when short). */
  echoBase?: string[];
}

interface Written {
  /** Empty when action is like or dislike. */
  text: string;
  action: "reply" | "like" | "dislike";
  stance: Stance;
  usage: { input: number; output: number };
}

// ---------------------------------------------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine for tick
  }
  const mode = String(body.mode ?? "");

  // ---- Cron path ----------------------------------------------------------------------------------------------
  if (req.headers.get("x-webhook-secret")) {
    const { data: authorised, error } = await admin.rpc("verify_push_webhook_secret", {
      p_secret: req.headers.get("x-webhook-secret"),
    });
    if (error || authorised !== true) return json({ error: "Unauthorized" }, 401);
    if (mode !== "tick") return json({ error: "Unknown mode" }, 400);
    return await handleTick();
  }

  // ---- Admin path ---------------------------------------------------------------------------------------------
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Missing Authorization header" }, 401);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "Invalid or expired session" }, 401);
  const { data: adminRow } = await admin.from("admin_roles").select("user_id").eq("user_id", userData.user.id).maybeSingle();
  if (!adminRow) return json({ error: "Admins only" }, 403);

  const accountId = String(body.account_id ?? "");
  if (!UUID_RE.test(accountId)) return json({ error: "account_id is required" }, 400);
  const postId = body.post_id == null || body.post_id === "" ? null : String(body.post_id);
  if (postId && !UUID_RE.test(postId)) return json({ error: "post_id is not valid" }, 400);

  if (mode === "preview") return await handlePreview(accountId, postId);
  if (mode === "comment_now") return await handleCommentNow(accountId, postId);
  return json({ error: "Unknown mode" }, 400);
});

// ---------------------------------------------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------------------------------------------

async function handleTick(): Promise<Response> {
  const { data: claimed, error } = await admin.rpc("automation_claim_due_comments", { p_limit: 5 });
  if (error) {
    console.error("run-comment-automation claim error:", error);
    return json({ error: "Claim failed" }, 500);
  }
  const jobs = (claimed ?? []) as { out_log_id: string }[];
  const work = Promise.allSettled(jobs.map((j) => processJob(j.out_log_id)));
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(work);
  } else {
    await work;
  }
  return json({ claimed: jobs.length }, 202);
}

// Admin "Preview": writes a comment and shows it, posting nothing.
async function handlePreview(accountId: string, postId: string | null): Promise<Response> {
  try {
    const account = await loadAccount(accountId);
    const exclude: string[] = [];
    let lastNote = "";
    for (let i = 0; i < MAX_TARGETS; i++) {
      const target = await chooseTarget(account, null, postId, exclude);
      if (!target) return json({ status: "nothing_to_comment" });
      try {
        const written = await write(account, target, chooseStance(account.comment_stance));
        return json({
          status: "ok",
          comment: written.text,
          stance: written.stance,
          target: { mode: target.mode, post_id: target.postId, heading: target.post.heading, text: target.post.content.slice(0, 200) },
        });
      } catch (err) {
        if (err instanceof Outcome || (err instanceof RunError && !postId)) {
          lastNote = err.message;
          exclude.push(target.postId);
          continue;
        }
        throw err;
      }
    }
    return json({ status: "skipped", message: lastNote || "Nothing worth a comment came up." });
  } catch (err) {
    return json({ status: "failed", error: messageOf(err) }, err instanceof RunError || err instanceof LlmError ? 200 : 500);
  }
}

// Admin "Comment now": a manual run, worked inline so the screen can show what happened.
async function handleCommentNow(accountId: string, postId: string | null): Promise<Response> {
  const { data: row, error } = await admin
    .from("automation_comment_log")
    .insert({
      account_id: accountId,
      kind: "comment",
      trigger: "manual",
      status: "running",
      attempts: 1,
      attempt_started_at: new Date().toISOString(),
      post_id: postId,
    })
    .select("id")
    .single();
  if (error || !row) return json({ status: "failed", error: "Couldn't start the run." }, 500);

  await processJob(row.id);
  const { data: done } = await admin
    .from("automation_comment_log")
    .select("status, content, stance, error, post_id, comment_id")
    .eq("id", row.id)
    .maybeSingle();
  return json({ status: done?.status ?? "failed", ...(done ?? {}) });
}

// ---------------------------------------------------------------------------------------------------------------
// One job
// ---------------------------------------------------------------------------------------------------------------

async function processJob(logId: string): Promise<void> {
  const { data: log } = await admin
    .from("automation_comment_log")
    .select("id, account_id, kind, trigger, status, post_id, source_comment_id, attempts")
    .eq("id", logId)
    .maybeSingle();
  if (!log || log.status !== "running") return;
  const job = log as LogRow;

  try {
    const account = await loadAccount(job.account_id);
    const outcome = await runJob(account, job);
    await finish(job.id, {
      status: "posted",
      post_id: outcome.postId,
      comment_id: outcome.commentId,
      content: outcome.text,
      stance: outcome.stance,
      model: `${account.ai.provider}:${account.ai.model}`,
      input_tokens: outcome.usage.input,
      output_tokens: outcome.usage.output,
      error: null,
    });
  } catch (err) {
    if (err instanceof Outcome) {
      await finish(job.id, { status: err.status, error: err.message });
      return;
    }
    const message = messageOf(err);
    if (isTransient(err) && job.attempts < MAX_RUNS) {
      // Try again in a few minutes. The claim function picks queued rows up again when due_at passes.
      await admin
        .from("automation_comment_log")
        .update({
          status: "queued",
          error: message,
          due_at: new Date(Date.now() + job.attempts * 3 * 60_000).toISOString(),
          attempt_started_at: null,
        })
        .eq("id", job.id);
      return;
    }
    console.error("run-comment-automation job failed:", job.id, message);
    await finish(job.id, { status: "failed", error: message });
  }
}

async function finish(id: string, patch: Record<string, unknown>) {
  await admin
    .from("automation_comment_log")
    .update({ ...patch, finished_at: new Date().toISOString() })
    .eq("id", id);
}

function isTransient(err: unknown): boolean {
  return err instanceof LlmError && /took too long|couldn't reach|unavailable|rate limited|error 5\d\d/i.test(err.message);
}

interface Posted {
  postId: string;
  /** null when the answer was a like or dislike. */
  commentId: string | null;
  text: string;
  stance: Stance;
  usage: { input: number; output: number };
}

async function runJob(account: AccountRow, job: LogRow): Promise<Posted> {
  // ---- A reply: the target is fixed, it is the comment that triggered the job ---------------------------------
  if (job.kind === "reply") {
    if (!job.source_comment_id) throw new Outcome("skipped", "There was no comment to answer.");
    const target = await replyTarget(account, job.source_comment_id);
    // A person who only repeats what the account already said gets a like, without a model call.
    if (target.mode === "reply") {
      const last = target.thread[target.thread.length - 1]?.content ?? "";
      if (isEcho(last, target.echoBase ?? [])) return await react(account, job, target, "like", { input: 0, output: 0 });
    }
    const written = await write(account, target, "support");
    if (written.action !== "reply") return await react(account, job, target, written.action, written.usage);
    return await publish(account, job, target, written);
  }

  // ---- A comment: a chosen post (admin) or a random pick, with a couple of fallbacks --------------------------
  // Only a post the admin chose is forced. For a scheduled job post_id is just where an earlier try got to.
  const forced = job.trigger === "manual" ? job.post_id : null;
  const exclude: string[] = [];
  let failure: Error | null = null;
  let skippedNote = "";
  for (let i = 0; i < MAX_TARGETS; i++) {
    const target = await chooseTarget(account, job, forced, exclude);
    if (!target) {
      if (failure) throw failure;
      throw new Outcome(skippedNote ? "skipped" : "nothing_to_comment", skippedNote || "Nothing left to comment on right now.");
    }
    try {
      const written = await write(account, target, chooseStance(account.comment_stance));
      return await publish(account, job, target, written);
    } catch (err) {
      // An admin who picked the post gets the answer for that post, not a different one.
      if (forced) throw err;
      if (err instanceof Outcome) skippedNote = err.message;
      else if (err instanceof RunError) failure = err;
      else throw err;
      exclude.push(target.postId);
      await admin.from("automation_comment_log").update({ post_id: null }).eq("id", job.id);
    }
  }
  if (failure) throw failure;
  throw new Outcome("skipped", skippedNote || "Nothing worth a comment came up.");
}

// ---------------------------------------------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------------------------------------------

async function loadAccount(accountId: string): Promise<AccountRow> {
  const { data: account, error } = await admin
    .from("automated_accounts")
    .select("id, user_id, system_prompt, comment_stance, comment_max_chars, comment_voice")
    .eq("id", accountId)
    .maybeSingle();
  if (error || !account) throw new RunError("That automated account no longer exists.");
  if (!account.system_prompt.trim()) throw new RunError("Add a system prompt for this account first.");

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, username, is_deleted")
    .eq("id", account.user_id)
    .maybeSingle();
  if (!profile || profile.is_deleted) throw new RunError("The Ak\u1ecd account behind this automation is missing or deleted.");

  // The account's own provider and key, from Vault. Nothing here is logged or returned to a browser.
  const { data: keyRows } = await admin.rpc("automation_get_api_key", { p_account_id: accountId });
  const keyRow = (keyRows ?? [])[0] as { provider: string; model: string | null; api_key: string } | undefined;
  if (!keyRow?.api_key || !isProvider(keyRow.provider)) {
    throw new RunError("This account has no AI provider key saved. Add one in its AI settings.");
  }

  return {
    ...(account as Omit<AccountRow, "ai" | "displayName" | "username">),
    ai: { provider: keyRow.provider, model: keyRow.model?.trim() || DEFAULT_MODELS[keyRow.provider], apiKey: keyRow.api_key },
    displayName: profile.display_name,
    username: profile.username,
  };
}

async function profileMap(ids: string[]): Promise<Map<string, { name: string; username: string }>> {
  const map = new Map<string, { name: string; username: string }>();
  if (!ids.length) return map;
  const { data } = await admin.from("profiles").select("id, display_name, username").in("id", [...new Set(ids)]);
  for (const p of data ?? []) map.set(p.id, { name: p.display_name, username: p.username });
  return map;
}

async function loadPost(postId: string): Promise<{ view: PostView; authorId: string } | null> {
  const { data: post } = await admin
    .from("posts")
    .select("id, author_id, heading, content, is_deleted, is_archived, status, visibility")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.is_deleted || post.is_archived || (post.status ?? "published") !== "published") return null;
  const who = (await profileMap([post.author_id])).get(post.author_id);
  return {
    authorId: post.author_id,
    view: { authorName: who?.name ?? "Someone", authorUsername: who?.username ?? "user", heading: post.heading, content: post.content ?? "" },
  };
}

/** What others have already said under the post, newest first, so the account does not repeat them. */
async function existingComments(postId: string, exceptUser: string): Promise<string[]> {
  const { data } = await admin
    .from("comments")
    .select("content")
    .eq("post_id", postId)
    .eq("is_deleted", false)
    .neq("author_id", exceptUser)
    .order("created_at", { ascending: false })
    .limit(6);
  return (data ?? []).map((c) => c.content as string);
}

/** The account's own recent comments, newest first: used to keep it from repeating its openings and emoji habits. */
async function recentOwn(userId: string): Promise<string[]> {
  const { data } = await admin
    .from("comments")
    .select("content")
    .eq("author_id", userId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(10);
  return (data ?? []).map((c) => c.content as string);
}

/** The comment being answered and the comments above it, oldest first. */
async function threadTo(commentId: string, account: AccountRow): Promise<{ thread: ThreadMessage[]; postId: string; authorId: string; parentId: string | null } | null> {
  const chain: { id: string; post_id: string; author_id: string; content: string; parent_comment_id: string | null; is_deleted: boolean }[] = [];
  let next: string | null = commentId;
  for (let depth = 0; next && depth < 6; depth++) {
    const { data } = await admin
      .from("comments")
      .select("id, post_id, author_id, content, parent_comment_id, is_deleted")
      .eq("id", next)
      .maybeSingle();
    if (!data) break;
    chain.unshift(data);
    next = data.parent_comment_id;
  }
  if (!chain.length || chain[chain.length - 1].id !== commentId || chain[chain.length - 1].is_deleted) return null;
  const names = await profileMap(chain.map((c) => c.author_id));
  const thread = chain
    .filter((c) => !c.is_deleted)
    .map((c) => ({
      authorName: names.get(c.author_id)?.name ?? "Someone",
      authorUsername: names.get(c.author_id)?.username ?? "user",
      isYou: c.author_id === account.user_id,
      content: c.content,
    }));
  const last = chain[chain.length - 1];
  return { thread, postId: last.post_id, authorId: last.author_id, parentId: last.parent_comment_id };
}

async function replyTarget(account: AccountRow, sourceCommentId: string): Promise<Target> {
  const found = await threadTo(sourceCommentId, account);
  if (!found) throw new Outcome("skipped", "The comment was deleted before the reply went out.");
  const post = await loadPost(found.postId);
  if (!post) throw new Outcome("skipped", "The post is no longer available.");

  const { data: blocked } = await admin
    .from("blocked_users")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${found.authorId},blocked_id.eq.${account.user_id}),and(blocker_id.eq.${account.user_id},blocked_id.eq.${found.authorId})`,
    )
    .limit(1);
  if (blocked?.length) throw new Outcome("skipped", "One of them has blocked the other.");

  // Who wrote the comment decides the kind of answer.
  const { data: botRow } = await admin.from("automated_accounts").select("id").eq("user_id", found.authorId).maybeSingle();
  const ownPost = post.authorId === account.user_id;
  let mode: Target["mode"] = "reply";
  if (botRow) mode = found.parentId === null && ownPost ? "close" : "react";

  const echoBase = found.thread.filter((m) => m.isYou).map((m) => m.content);
  if (ownPost && post.view.content.split(/\s+/).filter(Boolean).length <= 60) echoBase.push(post.view.content);

  return { mode, postId: found.postId, post: post.view, parentCommentId: sourceCommentId, thread: found.thread, existing: [], ownPost, echoBase };
}

/** Like or dislike the comment being answered, instead of writing one. Never both, never twice. */
async function react(account: AccountRow, job: LogRow, target: Target, type: "like" | "dislike", usage: { input: number; output: number }): Promise<Posted> {
  const commentId = job.source_comment_id;
  if (!commentId) throw new Outcome("skipped", "There was no comment to react to.");
  const { data: had } = await admin
    .from("reactions")
    .select("id")
    .eq("user_id", account.user_id)
    .eq("comment_id", commentId)
    .in("type", ["like", "dislike"])
    .is("acted_as_page_id", null)
    .limit(1);
  if (had?.length) throw new Outcome("skipped", "Already reacted to that comment.");

  const { error } = await admin.from("reactions").insert({ user_id: account.user_id, target_type: "comment", comment_id: commentId, type });
  if (error && error.code !== "23505") throw new RunError(`Couldn't ${type} the comment: ${error.message}`);
  return { postId: target.postId, commentId: null, text: `[${type}]`, stance: "support", usage };
}

/** Picks the post (or, once all posts are covered, the comment) for a daily comment. null = nothing left. */
async function chooseTarget(account: AccountRow, job: LogRow | null, forcedPostId: string | null, exclude: string[]): Promise<Target | null> {
  if (forcedPostId) {
    const post = await loadPost(forcedPostId);
    if (!post) throw new RunError("That post is not available to comment on.");
    if (post.authorId === account.user_id) throw new RunError("An account does not comment on its own posts.");
    return {
      mode: "post",
      postId: forcedPostId,
      post: post.view,
      parentCommentId: null,
      thread: [],
      existing: await existingComments(forcedPostId, account.user_id),
    };
  }

  const { data: pick, error } = await admin.rpc("automation_pick_comment_target", { p_account_id: account.id, p_exclude: exclude });
  if (error) throw new RunError(`Couldn't pick something to comment on: ${error.message}`);
  const kind = (pick as { kind: string | null } | null)?.kind;
  if (!kind) return null;

  const p = pick as { post_id: string; comment_id?: string };
  const post = await loadPost(p.post_id);
  if (!post) {
    exclude.push(p.post_id);
    return await chooseTarget(account, job, null, exclude);
  }
  if (job) await admin.from("automation_comment_log").update({ post_id: p.post_id, source_comment_id: p.comment_id ?? null }).eq("id", job.id);

  if (kind === "comment" && p.comment_id) {
    const found = await threadTo(p.comment_id, account);
    if (!found) {
      exclude.push(p.comment_id);
      return await chooseTarget(account, job, null, exclude);
    }
    return {
      mode: "under_comment",
      postId: p.post_id,
      post: post.view,
      parentCommentId: p.comment_id,
      thread: found.thread,
      existing: [],
    };
  }

  return {
    mode: "post",
    postId: p.post_id,
    post: post.view,
    parentCommentId: null,
    thread: [],
    existing: await existingComments(p.post_id, account.user_id),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------------------------------------------

async function write(account: AccountRow, target: Target, wanted: Stance): Promise<Written> {
  const mode = target.mode;
  const reply = mode === "reply" || mode === "close" || mode === "react";
  const system = buildSystemPrompt(
    {
      displayName: account.displayName,
      username: account.username,
      systemPrompt: account.system_prompt,
      voice: account.comment_voice,
      maxChars: account.comment_max_chars,
    },
    mode === "post" || mode === "under_comment" ? "comment" : mode,
  );
  const recent = await recentOwn(account.user_id);
  const usage = { input: 0, output: 0 };
  let problems: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const user = reply
      ? buildReplyUserMessage({ mode: mode as "reply" | "close" | "react", ownPost: target.ownPost, post: target.post, thread: target.thread, maxChars: account.comment_max_chars, recent, problems })
      : buildCommentUserMessage({
          post: target.post,
          stance: wanted,
          maxChars: account.comment_max_chars,
          existing: target.existing,
          recent,
          underComment: target.mode === "under_comment" ? target.thread[target.thread.length - 1] : undefined,
          problems,
        });

    const result = await callProvider({
      provider: account.ai.provider,
      model: account.ai.model,
      apiKey: account.ai.apiKey,
      system,
      user,
    });
    usage.input += result.usage.input;
    usage.output += result.usage.output;

    if (result.draft.skip) {
      throw new Outcome("skipped", `Not worth a comment${result.draft.skip_reason ? `: ${result.draft.skip_reason}` : "."}`);
    }

    if (mode === "react") {
      return { text: "", action: result.draft.action === "dislike" ? "dislike" : "like", stance: "support", usage };
    }
    if (reply && result.draft.action !== "reply") {
      // A like answers a person's comment. Disliking a person is never allowed, so that is simply not answered.
      if (result.draft.action === "like") return { text: "", action: "like", stance: "support", usage };
      throw new Outcome("skipped", "Chose not to answer.");
    }

    const stance: Stance = reply ? (mode === "close" && result.draft.stance === "question" ? "support" : result.draft.stance) : wanted;
    const checked = checkComment(result.draft.comment, {
      maxChars: account.comment_max_chars,
      reply,
      closing: mode === "close",
      stance,
      recent,
      existing: target.existing,
    });
    if (!checked.problems.length) return { text: checked.text, action: "reply", stance, usage };
    problems = checked.problems;
  }
  throw new RunError(`Couldn't write a comment that passed the checks. Last problems: ${problems.join(" ")}`);
}

// ---------------------------------------------------------------------------------------------------------------
// Posting
// ---------------------------------------------------------------------------------------------------------------

async function publish(account: AccountRow, job: LogRow, target: Target, written: Written): Promise<Posted> {
  // Same moderation gate as a comment written by a person.
  const modResponse = await fetch(`${SUPABASE_URL}/functions/v1/moderate-content`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: account.user_id, content_type: "comment", content: written.text }),
  });
  const modResult = await modResponse.json().catch(() => ({}));
  if (modResult.decision !== "allowed") {
    throw new Outcome("skipped", `Moderation did not allow this comment: ${modResult.message ?? modResult.decision ?? "unknown"}`);
  }

  const { data: inserted, error } = await admin
    .from("comments")
    .insert({
      post_id: target.postId,
      parent_comment_id: target.parentCommentId,
      author_id: account.user_id,
      content: written.text,
      stance: written.stance,
      client_request_id: job.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await admin
        .from("comments")
        .select("id")
        .eq("author_id", account.user_id)
        .eq("client_request_id", job.id)
        .maybeSingle();
      if (existing) return { postId: target.postId, commentId: existing.id, text: written.text, stance: written.stance, usage: written.usage };
    }
    throw new RunError(`Couldn't save the comment: ${error.message}`);
  }
  return { postId: target.postId, commentId: inserted.id, text: written.text, stance: written.stance, usage: written.usage };
}

// ---------------------------------------------------------------------------------------------------------------

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
