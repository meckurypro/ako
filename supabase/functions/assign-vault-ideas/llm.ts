// supabase/functions/assign-vault-ideas/llm.ts
//
// One structured call, three providers, for the System Bot. Same providers and the same approach as
// run-post-automation/llm.ts (forced tool call on Anthropic and OpenAI, JSON mode with a response schema on Gemini),
// but generic: the caller supplies the tool name and JSON schema, so this file does not depend on the post writer.
// Kept separate on purpose so the two functions can be deployed and changed independently.
//
// The API key never appears in a thrown error.

export type Provider = "anthropic" | "openai" | "gemini";

export const PROVIDER_LABEL: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
};

// Used when the System Bot has no model override. Change the model from the admin screen instead of here.
export const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-sonnet-5-5",
  openai: "gpt-4.1",
  gemini: "gemini-3.5-flash",
};

export function isProvider(value: unknown): value is Provider {
  return value === "anthropic" || value === "openai" || value === "gemini";
}

export class LlmError extends Error {}

export interface StructuredRequest {
  provider: Provider;
  model: string;
  apiKey: string;
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  /** A JSON schema object (lower case types). Converted for Gemini. */
  schema: Record<string, unknown>;
  maxTokens?: number;
  fetchFn?: typeof fetch;
}

export interface StructuredResult {
  input: Record<string, unknown>;
  usage: { input: number; output: number };
}

const MAX_HTTP_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [2000, 6000];

export async function callStructured(req: StructuredRequest): Promise<StructuredResult> {
  const doFetch = req.fetchFn ?? fetch;
  const label = PROVIDER_LABEL[req.provider];

  for (let attempt = 1; attempt <= MAX_HTTP_ATTEMPTS; attempt++) {
    const last = attempt === MAX_HTTP_ATTEMPTS;
    let res: Response;
    try {
      res = await doFetch(...buildRequest(req));
    } catch (err) {
      const name = (err as { name?: string })?.name;
      const timedOut = name === "TimeoutError" || name === "AbortError";
      if (!timedOut && !last) {
        await sleep(delay(attempt));
        continue;
      }
      throw new LlmError(timedOut ? `${label} took too long to answer.` : `Couldn't reach ${label}.`);
    }

    if (res.ok) {
      const data = await res.json().catch(() => null);
      return parseResponse(req.provider, data, label);
    }

    const retryable = res.status === 408 || res.status === 429 || res.status >= 500;
    if (retryable && !last) {
      await res.body?.cancel().catch(() => {});
      await sleep(delay(attempt, res));
      continue;
    }
    throw new LlmError(await describeFailure(res, req, label));
  }
  throw new LlmError(`${label} is unavailable right now.`);
}

function delay(attempt: number, res?: Response): number {
  const base = RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)];
  const retryAfter = Number(res?.headers.get("retry-after"));
  const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 20_000) : base;
  return wait + Math.floor(Math.random() * 1000);
}

// Gemini's response schema takes the OpenAPI subset with upper case type names.
function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    out[key] = key === "type" && typeof value === "string" ? value.toUpperCase() : toGeminiSchema(value);
  }
  return out;
}

function buildRequest(req: StructuredRequest): [string, RequestInit] {
  const signal = AbortSignal.timeout(60_000);
  const json = { "content-type": "application/json" };
  const maxTokens = req.maxTokens ?? 700;

  switch (req.provider) {
    case "anthropic":
      return [
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: { ...json, "x-api-key": req.apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: req.model,
            max_tokens: maxTokens,
            system: req.system,
            messages: [{ role: "user", content: req.user }],
            tools: [{ name: req.toolName, description: req.toolDescription, input_schema: req.schema }],
            tool_choice: { type: "tool", name: req.toolName },
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
            max_completion_tokens: maxTokens,
            messages: [
              { role: "system", content: req.system },
              { role: "user", content: req.user },
            ],
            tools: [
              { type: "function", function: { name: req.toolName, description: req.toolDescription, parameters: req.schema } },
            ],
            tool_choice: { type: "function", function: { name: req.toolName } },
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
              responseSchema: toGeminiSchema(req.schema),
              // Gemini spends part of this budget on thinking, so leave room.
              maxOutputTokens: Math.max(maxTokens, 2048),
            },
          }),
          signal,
        },
      ];
  }
}

function parseResponse(provider: Provider, data: unknown, label: string): StructuredResult {
  const d = (data ?? {}) as Record<string, any>;

  if (provider === "anthropic") {
    const block = (d.content ?? []).find((b: { type?: string }) => b?.type === "tool_use");
    if (!block?.input || typeof block.input !== "object") throw new LlmError(`${label} returned no decision.`);
    return {
      input: block.input,
      usage: { input: Number(d.usage?.input_tokens ?? 0), output: Number(d.usage?.output_tokens ?? 0) },
    };
  }

  if (provider === "openai") {
    const args = d.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const input = typeof args === "string" ? safeJson(args) : null;
    if (!input) throw new LlmError(`${label} returned no decision.`);
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
    throw new LlmError(`${label} returned no decision${blocked && blocked !== "STOP" ? ` (${String(blocked).toLowerCase()})` : ""}.`);
  }
  return {
    input,
    usage: {
      input: Number(d.usageMetadata?.promptTokenCount ?? 0),
      output: Number(d.usageMetadata?.candidatesTokenCount ?? 0) + Number(d.usageMetadata?.thoughtsTokenCount ?? 0),
    },
  };
}

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

async function describeFailure(res: Response, req: StructuredRequest, label: string): Promise<string> {
  if (res.status === 401 || res.status === 403) {
    return `${label} rejected the System Bot's API key. Check it, paste it again and save.`;
  }
  const raw = await res.text().catch(() => "");
  let detail = "";
  try {
    const parsed = JSON.parse(raw);
    detail = String(parsed?.error?.message ?? parsed?.message ?? "");
  } catch {
    detail = raw;
  }
  detail = detail.split(req.apiKey).join("[key]").replace(/\s+/g, " ").trim().slice(0, 200);

  if (res.status === 400 && /api key|api_key/i.test(detail)) {
    return `${label} rejected the System Bot's API key. Check it, paste it again and save.`;
  }
  if (res.status === 404) {
    return `${label} doesn't have a model called "${req.model}". Check the model name in the System Bot settings.`;
  }
  if (res.status === 429) {
    return `${label} says the System Bot's key is out of quota or rate limited. Check billing and limits, then try again.`;
  }
  return `${label} error ${res.status}${detail ? `: ${detail}` : ""}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
