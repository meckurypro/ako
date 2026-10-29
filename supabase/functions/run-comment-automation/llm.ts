// supabase/functions/run-comment-automation/llm.ts
//
// One call, three providers, for comments. Same approach as run-post-automation/llm.ts (each automated account has its
// own provider and key in Supabase Vault, read at run time through automation_get_api_key), but the structured answer
// is a tiny comment object: { skip, skip_reason, stance, comment }.
//   anthropic  Messages API, forced tool call
//   openai     Chat Completions, forced function call
//   gemini     generateContent, JSON mode with a response schema
// Kept as its own copy so each edge function deploys on its own. The API key never appears in a thrown error.

export type Provider = "anthropic" | "openai" | "gemini";

export const PROVIDERS: readonly Provider[] = ["anthropic", "openai", "gemini"];

export const PROVIDER_LABEL: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
};

// Used when the account has no model override. Keep in step with run-post-automation/llm.ts.
export const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-sonnet-5-5",
  openai: "gpt-4.1",
  gemini: "gemini-3.5-flash",
};

export function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && (PROVIDERS as readonly string[]).includes(value);
}

export interface CommentDraft {
  skip: boolean;
  skip_reason: string;
  stance: "support" | "question" | "pushback";
  comment: string;
}

export interface LlmResult {
  draft: CommentDraft;
  usage: { input: number; output: number };
}

export interface LlmRequest {
  provider: Provider;
  model: string;
  apiKey: string;
  system: string;
  user: string;
  fetchFn?: typeof fetch;
}

export class LlmError extends Error {}

const TOOL_NAME = "submit_comment";
const TOOL_DESCRIPTION = "Submit the comment, or skip when there is nothing natural to say.";

const FIELDS = {
  skip: { type: "boolean", description: "True when you should not comment at all. Then leave comment empty." },
  skip_reason: { type: "string", description: "Why you skipped, a few words. Empty when you did not skip." },
  stance: {
    type: "string",
    description: "What the comment does: support (adds or agrees), question, or pushback.",
    enum: ["support", "question", "pushback"],
  },
  comment: { type: "string", description: "The comment text, exactly as it should appear. Empty when you skipped." },
} as const;

const REQUIRED = ["skip", "skip_reason", "stance", "comment"];

function jsonSchema() {
  const properties: Record<string, unknown> = {};
  for (const [name, f] of Object.entries(FIELDS)) {
    properties[name] = { type: f.type, description: f.description, ...("enum" in f ? { enum: [...f.enum] } : {}) };
  }
  return { type: "object", properties, required: REQUIRED };
}

// Gemini's response schema takes the OpenAPI subset with upper case type names.
function geminiSchema() {
  const properties: Record<string, unknown> = {};
  for (const [name, f] of Object.entries(FIELDS)) {
    properties[name] = { type: f.type.toUpperCase(), description: f.description, ...("enum" in f ? { enum: [...f.enum] } : {}) };
  }
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
        name === "TimeoutError" || name === "AbortError" ? `${label} took too long to answer.` : `Couldn't reach ${label}.`,
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
  const signal = AbortSignal.timeout(60_000);
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
            max_tokens: 600,
            system: req.system,
            messages: [{ role: "user", content: req.user }],
            tools: [{ name: TOOL_NAME, description: TOOL_DESCRIPTION, input_schema: jsonSchema() }],
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
            max_completion_tokens: 600,
            messages: [
              { role: "system", content: req.system },
              { role: "user", content: req.user },
            ],
            tools: [{ type: "function", function: { name: TOOL_NAME, description: TOOL_DESCRIPTION, parameters: jsonSchema() } }],
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
              responseSchema: geminiSchema(),
              // Gemini 2.5+ spends part of this budget on thinking, so leave room.
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
  let input: Record<string, unknown> | null = null;
  let usage = { input: 0, output: 0 };

  if (provider === "anthropic") {
    const block = (d.content ?? []).find((b: { type?: string }) => b?.type === "tool_use");
    input = block?.input && typeof block.input === "object" ? block.input : null;
    usage = { input: Number(d.usage?.input_tokens ?? 0), output: Number(d.usage?.output_tokens ?? 0) };
  } else if (provider === "openai") {
    const args = d.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    input = typeof args === "string" ? safeJson(args) : null;
    usage = { input: Number(d.usage?.prompt_tokens ?? 0), output: Number(d.usage?.completion_tokens ?? 0) };
  } else {
    const text = (d.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => (typeof p?.text === "string" ? p.text : ""))
      .join("");
    input = text ? safeJson(text) : null;
    usage = {
      input: Number(d.usageMetadata?.promptTokenCount ?? 0),
      output: Number(d.usageMetadata?.candidatesTokenCount ?? 0) + Number(d.usageMetadata?.thoughtsTokenCount ?? 0),
    };
    if (!input) {
      const blocked = d.promptFeedback?.blockReason ?? d.candidates?.[0]?.finishReason;
      throw new LlmError(`${label} returned no comment${blocked && blocked !== "STOP" ? ` (${String(blocked).toLowerCase()})` : ""}.`);
    }
  }

  if (!input) throw new LlmError(`${label} returned no comment.`);
  return { draft: toDraft(input), usage };
}

function toDraft(input: Record<string, unknown>): CommentDraft {
  const stance = input.stance === "question" || input.stance === "pushback" ? input.stance : "support";
  const skip = input.skip === true || input.skip === "true";
  return {
    skip,
    skip_reason: typeof input.skip_reason === "string" ? input.skip_reason.trim().slice(0, 200) : "",
    stance,
    comment: typeof input.comment === "string" ? input.comment : "",
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
