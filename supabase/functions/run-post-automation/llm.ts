// supabase/functions/run-post-automation/llm.ts
//
// One call, three providers. Each automated account stores its own provider and key (Supabase Vault, see
// supabase/ako_post_automation_api_keys.sql); this turns "system prompt + user message" into the structured post
// object, whichever provider the account uses:
//   anthropic  Messages API, forced tool call
//   openai     Chat Completions, forced function call
//   gemini     generateContent, JSON mode with a response schema
//
// Transient failures (429, 5xx, 408, dropped connections) are retried here with backoff, honouring Retry-After. A run
// that still fails is retried later by the database (supabase/ako_post_automation_retry.sql).
//
// Pure apart from `fetch` (injectable), so it can be unit-tested in node. The API key never appears in a thrown error.

export type Provider = "anthropic" | "openai" | "gemini";

export const PROVIDERS: readonly Provider[] = ["anthropic", "openai", "gemini"];

export const PROVIDER_LABEL: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
};

// Used when the account has no model override. Change a model per account from the admin screen instead of here.
export const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-sonnet-5-5",
  openai: "gpt-4.1",
  gemini: "gemini-3.5-flash",
};

export function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && (PROVIDERS as readonly string[]).includes(value);
}

export interface LlmResult {
  /** The submitted post fields, exactly as the model produced them. */
  input: Record<string, unknown>;
  usage: { input: number; output: number };
}

export interface LlmRequest {
  provider: Provider;
  model: string;
  apiKey: string;
  system: string;
  user: string;
  /** Allowed values for the `mode` field. */
  modes: readonly string[];
  /** News pipeline: also ask for `sources`, the labels of the articles the post relied on. */
  includeSources?: boolean;
  /** Watch and voices pipelines: also ask for `sources` (labels of the Akọ posts or comment sections that prompted it) and let the model `skip`. */
  watch?: boolean;
  fetchFn?: typeof fetch;
}

export class LlmError extends Error {}

const TOOL_NAME = "submit_post";
const TOOL_DESCRIPTION = "Submit the finished post.";

interface FieldSpec {
  description: string;
  enum?: readonly string[];
}

function fieldSpecs(modes: readonly string[]): Record<string, FieldSpec> {
  return {
    header: { description: "The post header." },
    body: {
      description:
        "The post body: short paragraphs separated by a blank line, with single asterisk bold and single underscore italic markers used sparingly.",
    },
    topic: { description: "The subject in a few words, for the account's topic history." },
    content_angle: { description: "The specific angle taken, one short sentence." },
    mode: { description: "The content mode used.", enum: modes },
    source_idea_id: { description: "The id of the stored idea used, if one was provided." },
  };
}

const REQUIRED = ["header", "body", "topic", "content_angle", "mode"];

const KEY_REFERENCES_DESCRIPTION =
  'The specific people, books, works, events, studies or named ideas this post is built on, as commonly written, for example ["Seneca", "On the Shortness of Life"]. Never countries, regions or generic nouns.';

const SOURCES_DESCRIPTION =
  'The labels of every supplied article the post relied on, for example ["A1", "A3"]. Use only labels that were provided.';

const WATCH_SOURCES_DESCRIPTION =
  'The labels of the supplied Akọ posts or comment sections that prompted this post, for example ["P2"] or ["C1"]. Use only labels that were provided. Empty when you skip.';

const SKIP_DESCRIPTION =
  "True when nothing in the supplied material deserves a post today. Then leave header, body, topic and content_angle empty and set mode to discuss.";

const SKIP_REASON_DESCRIPTION = "Why you skipped, in a few words. Empty when you did not skip.";

function jsonSchema(modes: readonly string[], includeSources = false, watch = false) {
  const properties: Record<string, unknown> = {};
  for (const [name, spec] of Object.entries(fieldSpecs(modes))) {
    properties[name] = { type: "string", description: spec.description, ...(spec.enum ? { enum: [...spec.enum] } : {}) };
  }
  properties.key_references = { type: "array", items: { type: "string" }, description: KEY_REFERENCES_DESCRIPTION };
  if (watch) {
    delete properties.source_idea_id;
    properties.sources = { type: "array", items: { type: "string" }, description: WATCH_SOURCES_DESCRIPTION };
    properties.skip = { type: "boolean", description: SKIP_DESCRIPTION };
    properties.skip_reason = { type: "string", description: SKIP_REASON_DESCRIPTION };
    return { type: "object", properties, required: [...REQUIRED, "key_references", "sources", "skip", "skip_reason"] };
  }
  if (includeSources) {
    delete properties.source_idea_id;
    properties.sources = { type: "array", items: { type: "string" }, description: SOURCES_DESCRIPTION };
    return { type: "object", properties, required: [...REQUIRED, "key_references", "sources"] };
  }
  return { type: "object", properties, required: [...REQUIRED, "key_references"] };
}

// Gemini's response schema takes the OpenAPI subset with upper case type names and no `required` beyond the list.
function geminiSchema(modes: readonly string[], includeSources = false, watch = false) {
  const properties: Record<string, unknown> = {};
  for (const [name, spec] of Object.entries(fieldSpecs(modes))) {
    properties[name] = {
      type: "STRING",
      description: spec.description,
      ...(spec.enum ? { enum: [...spec.enum] } : {}),
    };
  }
  properties.key_references = { type: "ARRAY", items: { type: "STRING" }, description: KEY_REFERENCES_DESCRIPTION };
  if (watch) {
    delete properties.source_idea_id;
    properties.sources = { type: "ARRAY", items: { type: "STRING" }, description: WATCH_SOURCES_DESCRIPTION };
    properties.skip = { type: "BOOLEAN", description: SKIP_DESCRIPTION };
    properties.skip_reason = { type: "STRING", description: SKIP_REASON_DESCRIPTION };
    return { type: "OBJECT", properties, required: [...REQUIRED, "key_references", "sources", "skip", "skip_reason"] };
  }
  if (includeSources) {
    delete properties.source_idea_id;
    properties.sources = { type: "ARRAY", items: { type: "STRING" }, description: SOURCES_DESCRIPTION };
    return { type: "OBJECT", properties, required: [...REQUIRED, "key_references", "sources"] };
  }
  properties.source_idea_id = { ...(properties.source_idea_id as object), nullable: true };
  return { type: "OBJECT", properties, required: [...REQUIRED, "key_references"] };
}

// ---------------------------------------------------------------------------------------------------------------

const MAX_HTTP_ATTEMPTS = 4;
const RETRY_DELAYS_MS = [2000, 6000, 15000];

// Backoff for attempt N (1 based), or the provider's Retry-After when it sends one (capped at 20 seconds). Jittered.
function retryDelay(attempt: number, res?: Response): number {
  const base = RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)];
  const retryAfter = Number(res?.headers.get("retry-after"));
  const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 20_000) : base;
  return wait + Math.floor(Math.random() * 1000);
}

export async function callProvider(req: LlmRequest): Promise<LlmResult> {
  const doFetch = req.fetchFn ?? fetch;
  const label = PROVIDER_LABEL[req.provider];

  for (let attempt = 1; attempt <= MAX_HTTP_ATTEMPTS; attempt++) {
    const lastAttempt = attempt === MAX_HTTP_ATTEMPTS;
    let res: Response;
    try {
      res = await doFetch(...buildRequest(req));
    } catch (err) {
      const name = (err as { name?: string })?.name;
      const timedOut = name === "TimeoutError" || name === "AbortError";
      if (!timedOut && !lastAttempt) {
        await sleep(retryDelay(attempt));
        continue;
      }
      throw new LlmError(timedOut ? `${label} took too long to answer.` : `Couldn't reach ${label}.`);
    }

    if (res.ok) {
      const data = await res.json().catch(() => null);
      return parseResponse(req.provider, data, label);
    }

    const retryable = res.status === 408 || res.status === 429 || res.status >= 500;
    if (retryable && !lastAttempt) {
      await res.body?.cancel().catch(() => {});
      await sleep(retryDelay(attempt, res));
      continue;
    }
    throw new LlmError(await describeFailure(res, req, label));
  }
  throw new LlmError(`${label} is unavailable right now.`);
}

function buildRequest(req: LlmRequest): [string, RequestInit] {
  const signal = AbortSignal.timeout(90_000);
  const json = { "content-type": "application/json" };

  switch (req.provider) {
    case "anthropic":
      return [
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: { ...json, "x-api-key": req.apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: req.model,
            max_tokens: 1500,
            system: req.system,
            messages: [{ role: "user", content: req.user }],
            tools: [
              {
                name: TOOL_NAME,
                description: TOOL_DESCRIPTION,
                input_schema: jsonSchema(req.modes, req.includeSources, req.watch),
              },
            ],
            tool_choice: { type: "tool", name: TOOL_NAME },
          }),
          signal,
        },
      ];

    case "openai":
      return [
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: { ...json, authorization: `Bearer ${req.apiKey}` },
          body: JSON.stringify({
            model: req.model,
            max_completion_tokens: 1500,
            messages: [
              { role: "system", content: req.system },
              { role: "user", content: req.user },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: TOOL_NAME,
                  description: TOOL_DESCRIPTION,
                  parameters: jsonSchema(req.modes, req.includeSources, req.watch),
                },
              },
            ],
            tool_choice: { type: "function", function: { name: TOOL_NAME } },
          }),
          signal,
        },
      ];

    case "gemini":
      return [
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}:generateContent`,
        {
          method: "POST",
          headers: { ...json, "x-goog-api-key": req.apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: req.system }] },
            contents: [{ role: "user", parts: [{ text: req.user }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: geminiSchema(req.modes, req.includeSources, req.watch),
              // Gemini 2.5 spends part of this budget on thinking, so leave room.
              maxOutputTokens: 4096,
            },
          }),
          signal,
        },
      ];
  }
}

function parseResponse(provider: Provider, data: unknown, label: string): LlmResult {
  const d = (data ?? {}) as Record<string, any>;

  if (provider === "anthropic") {
    const block = (d.content ?? []).find((b: { type?: string }) => b?.type === "tool_use");
    if (!block?.input || typeof block.input !== "object") throw new LlmError(`${label} returned no post.`);
    return {
      input: block.input,
      usage: { input: Number(d.usage?.input_tokens ?? 0), output: Number(d.usage?.output_tokens ?? 0) },
    };
  }

  if (provider === "openai") {
    const message = d.choices?.[0]?.message;
    const args = message?.tool_calls?.[0]?.function?.arguments;
    const input = typeof args === "string" ? safeJson(args) : null;
    if (!input) throw new LlmError(`${label} returned no post.`);
    return {
      input,
      usage: { input: Number(d.usage?.prompt_tokens ?? 0), output: Number(d.usage?.completion_tokens ?? 0) },
    };
  }

  const text = (d.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => (typeof p?.text === "string" ? p.text : ""))
    .join("");
  const input = text ? safeJson(text) : null;
  if (!input) {
    const blocked = d.promptFeedback?.blockReason ?? d.candidates?.[0]?.finishReason;
    throw new LlmError(`${label} returned no post${blocked && blocked !== "STOP" ? ` (${String(blocked).toLowerCase()})` : ""}.`);
  }
  return {
    input,
    usage: {
      input: Number(d.usageMetadata?.promptTokenCount ?? 0),
      output: Number(d.usageMetadata?.candidatesTokenCount ?? 0) + Number(d.usageMetadata?.thoughtsTokenCount ?? 0),
    },
  };
}

// Models occasionally wrap JSON in a code fence or add a sentence around it.
function safeJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function describeFailure(res: Response, req: LlmRequest, label: string): Promise<string> {
  if (res.status === 401 || res.status === 403) {
    return `${label} rejected this API key. Check it, paste it again and save.`;
  }

  const raw = await res.text().catch(() => "");
  let detail = "";
  try {
    const parsed = JSON.parse(raw);
    detail = String(parsed?.error?.message ?? parsed?.message ?? "");
  } catch {
    detail = raw;
  }
  detail = scrub(detail, req.apiKey).replace(/\s+/g, " ").trim().slice(0, 200);

  // Gemini answers a bad key with 400 rather than 401.
  if (res.status === 400 && /api key|api_key/i.test(detail)) {
    return `${label} rejected this API key. Check it, paste it again and save.`;
  }
  if (res.status === 404) {
    return `${label} doesn't have a model called "${req.model}". Check the model name in this account's AI settings.`;
  }
  if (res.status === 429) {
    return `${label} says this key is out of quota or rate limited. Check billing and limits, then try again.`;
  }
  return `${label} error ${res.status}${detail ? `: ${detail}` : ""}`;
}

function scrub(text: string, key: string): string {
  if (!key) return text;
  return text.split(key).join("[key]");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
