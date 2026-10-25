// supabase/functions/run-post-automation/llm.ts
//
// One call, three providers. Each automated account stores its own provider and key (Supabase Vault, see
// supabase/ako_post_automation_api_keys.sql); this turns "system prompt + user message" into the structured post
// object, whichever provider the account uses:
//   anthropic  Messages API, forced tool call
//   openai     Chat Completions, forced function call
//   gemini     generateContent, JSON mode with a response schema
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

const SOURCES_DESCRIPTION =
  'The labels of every supplied article the post relied on, for example ["A1", "A3"]. Use only labels that were provided.';

function jsonSchema(modes: readonly string[], includeSources = false) {
  const properties: Record<string, unknown> = {};
  for (const [name, spec] of Object.entries(fieldSpecs(modes))) {
    properties[name] = { type: "string", description: spec.description, ...(spec.enum ? { enum: [...spec.enum] } : {}) };
  }
  if (includeSources) {
    delete properties.source_idea_id;
    properties.sources = { type: "array", items: { type: "string" }, description: SOURCES_DESCRIPTION };
    return { type: "object", properties, required: [...REQUIRED, "sources"] };
  }
  return { type: "object", properties, required: REQUIRED };
}

// Gemini's response schema takes the OpenAPI subset with upper case type names and no `required` beyond the list.
function geminiSchema(modes: readonly string[], includeSources = false) {
  const properties: Record<string, unknown> = {};
  for (const [name, spec] of Object.entries(fieldSpecs(modes))) {
    properties[name] = {
      type: "STRING",
      description: spec.description,
      ...(spec.enum ? { enum: [...spec.enum] } : {}),
    };
  }
  if (includeSources) {
    delete properties.source_idea_id;
    properties.sources = { type: "ARRAY", items: { type: "STRING" }, description: SOURCES_DESCRIPTION };
    return { type: "OBJECT", properties, required: [...REQUIRED, "sources"] };
  }
  properties.source_idea_id = { ...(properties.source_idea_id as object), nullable: true };
  return { type: "OBJECT", properties, required: REQUIRED };
}

// ---------------------------------------------------------------------------------------------------------------

export async function callProvider(req: LlmRequest): Promise<LlmResult> {
  const doFetch = req.fetchFn ?? fetch;
  const label = PROVIDER_LABEL[req.provider];

  for (let attempt = 1; attempt <= 2; attempt++) {
    let res: Response;
    try {
      res = await doFetch(...buildRequest(req));
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (attempt === 1 && name !== "TimeoutError" && name !== "AbortError") {
        await sleep(2000);
        continue;
      }
      throw new LlmError(
        name === "TimeoutError" || name === "AbortError"
          ? `${label} took too long to answer.`
          : `Couldn't reach ${label}.`,
      );
    }

    if (res.ok) {
      const data = await res.json().catch(() => null);
      return parseResponse(req.provider, data, label);
    }

    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt === 1) {
      await sleep(3000);
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
            tools: [{ name: TOOL_NAME, description: TOOL_DESCRIPTION, input_schema: jsonSchema(req.modes, req.includeSources) }],
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
                function: { name: TOOL_NAME, description: TOOL_DESCRIPTION, parameters: jsonSchema(req.modes, req.includeSources) },
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
              responseSchema: geminiSchema(req.modes, req.includeSources),
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
