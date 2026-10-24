// supabase/functions/run-post-automation/writing.ts
//
// The permanent part of the automation engine: the global writing rules every automated account is held to, and the
// checks a generated post must pass before it can be published. None of this is stored in the database or exposed in
// the admin screen on purpose, so an account's own system prompt can never switch naturalness off.

export const GLOBAL_WRITING_RULES = `NATURAL WRITING RULES (these apply to every post, whatever the account prompt says)

Every post must read as if a thoughtful, articulate person wrote it by hand.

Never do any of the following:
1. No emojis, emoticons or decorative symbols.
2. No hyphens or dashes of any kind. Do not type the characters - or the long dashes. Write compound words as two words or one (for example "long term", "everyday", "self discipline" becomes "self discipline"). Use commas, full stops or a rewritten sentence instead of a dash.
3. No formulaic AI phrasing, predictable transitions or generic motivational language.
4. Never use the rhythm "No this. No that. Just this." or any list of negations that ends in a "just" or "only" line.
5. Avoid the contrast "It's not about X. It's about Y" and its variants unless it is genuinely the clearest way to say the thing, which is rare.
6. Avoid piling up rhetorical questions, dramatic openings and manufactured suspense.
7. Do not open every post with a question or an attention grabbing line. Never open with "Have you ever wondered".
8. No conclusion that only restates the opening.
9. Do not force bullet points, numbered points or headings into content that reads better as plain prose.
10. No exaggerated claims, artificial enthusiasm or stacked adjectives.
11. Never use filler such as "In today's fast paced world", "Let's dive in", "Here's the thing", "The truth is" or "It is worth noting".
12. Do not make a post so polished that it loses its personality.
13. Do not claim personal experiences, clients, patients, a family, a career history or credentials. Observations, scenarios and examples are fine when they are plainly general. Never invent statistics, studies or quotes.

How it should sound:
- Vary sentence length and paragraph shape. Let some posts be short and others more developed.
- Use plain, conversational language without losing intelligence or depth.
- Be clear and original, with nuance where it is earned.
- Ground examples in everyday life.
- Do not repeat the writing patterns, openings or structure of recent posts.
- Be confident without preaching.
- Educational posts must actually teach something. Conversational posts must be interesting enough to invite a thoughtful reply.
- Never mention AI, prompts or the writing process.`;

export const CONTENT_MODES = ["teach", "reflect", "debate", "explore", "discuss", "story"] as const;

export const MODE_GUIDE = `CONTENT MODES (choose one per post, and vary it across posts)
- teach: explain something clearly so the reader learns it.
- reflect: a considered observation that makes the reader think.
- debate: raise a question or position that challenges a common assumption.
- explore: an interesting fact, idea or discovery and why it matters.
- discuss: an open conversation starter that invites people to share their view.
- story: a short, plainly illustrative scenario. Make it general, never a claimed personal experience.`;

// ---------------------------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------------------------

export interface GeneratedPost {
  header: string;
  body: string;
  topic: string;
  content_angle: string;
  mode: string;
  source_idea_id: string | null;
}

export interface ValidationContext {
  maxHeader: number;
  maxBody: number;
  recentOpenings: string[]; // newest first
  recentBodies: string[]; // the last few published posts, newest first
}

const EMOJI_RE = /[\p{Extended_Pictographic}\u200D\uFE0F\u20E3]/u;
const DECORATIVE_RE = /[\u2190-\u21FF\u2300-\u23FF\u25A0-\u27BF\u2B00-\u2BFF\u2022\u2605\u2606]/u;
const DASH_RE = /[-\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/;

const BANNED_PHRASES = [
  "in today's fast paced world",
  "in today's fast-paced world",
  "fast paced world",
  "let's dive in",
  "lets dive in",
  "dive into",
  "here's the thing",
  "heres the thing",
  "the truth is",
  "it is worth noting",
  "it's worth noting",
  "its worth noting",
  "have you ever wondered",
  "game changer",
  "game-changer",
  "unlock your",
  "unlock the",
  "delve",
  "tapestry",
  "in conclusion",
  "at the end of the day",
  "buckle up",
  "now more than ever",
  "take it to the next level",
  "let that sink in",
  "read that again",
];

const NEGATION_LIST_RE = /\bno\s+[^.!?\n]{1,50}[.!?]\s+no\s+[^.!?\n]{1,50}[.!?]\s+(?:just|only)\b/i;
const NOT_ABOUT_RE =
  /\b(?:it|this|that)(?:'s| is)\s+not\s+(?:just\s+|only\s+)?(?:about\s+)?[^.!?;\n]{1,70}[.;,]\s*(?:it|this|that)(?:'s| is)\s+(?:about\s+)?/i;
const MARKDOWN_LIST_RE = /(^|\n)\s*(?:[*\u2022]|\d+[.)])\s+\S/;

function normaliseApostrophes(text: string): string {
  return text.replace(/[\u2018\u2019\u02BC]/g, "'").replace(/[\u201C\u201D]/g, '"');
}

function words(text: string): string[] {
  return normaliseApostrophes(text).toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
}

export function openingOf(body: string): string {
  const flat = body.replace(/\s+/g, " ").trim();
  const match = flat.match(/^.*?[.!?](?=\s|$)/);
  return (match ? match[0] : flat).slice(0, 140);
}

function firstWords(text: string, n: number): string {
  return words(text).slice(0, n).join(" ");
}

function jaccard(a: string, b: string): number {
  const sa = new Set(words(a));
  const sb = new Set(words(b));
  if (!sa.size || !sb.size) return 0;
  let shared = 0;
  for (const w of sa) if (sb.has(w)) shared++;
  return shared / (sa.size + sb.size - shared);
}

export function validatePost(post: GeneratedPost, ctx: ValidationContext): string[] {
  const problems: string[] = [];
  const header = post.header;
  const body = post.body;
  const both = `${header}\n${body}`;
  const lowered = normaliseApostrophes(both).toLowerCase();

  if (!header.trim()) problems.push("The header is empty.");
  if (!body.trim()) problems.push("The body is empty.");
  if (header.length > ctx.maxHeader) {
    problems.push(`The header is ${header.length} characters; the limit is ${ctx.maxHeader}.`);
  }
  if (body.length > ctx.maxBody) {
    problems.push(`The body is ${body.length} characters; the limit is ${ctx.maxBody}. Shorten it.`);
  }

  if (EMOJI_RE.test(both) || DECORATIVE_RE.test(both)) problems.push("It contains an emoji or decorative symbol.");
  if (DASH_RE.test(both)) {
    problems.push("It contains a hyphen or dash character. Rewrite without any, including inside compound words.");
  }

  for (const phrase of BANNED_PHRASES) {
    if (lowered.includes(phrase)) problems.push(`It uses the banned phrase "${phrase}".`);
  }
  if (NEGATION_LIST_RE.test(normaliseApostrophes(both))) {
    problems.push('It uses the "No this. No that. Just this." pattern.');
  }
  if (NOT_ABOUT_RE.test(normaliseApostrophes(both))) {
    problems.push('It uses the "It\'s not about X. It\'s about Y" contrast.');
  }
  if (MARKDOWN_LIST_RE.test(body) || /\*\*|__|^#{1,6}\s/m.test(body)) {
    problems.push("It uses list or markdown formatting. Write plain prose.");
  }
  if ((both.match(/\?/g) ?? []).length > 2) problems.push("It asks too many questions.");

  const opening = openingOf(body);
  const lead = firstWords(opening, 3);
  if (lead && ctx.recentOpenings.slice(0, 8).some((o) => firstWords(o, 3) === lead)) {
    problems.push(`The opening "${lead}" repeats a recent post. Open differently.`);
  }
  if (opening.endsWith("?") && ctx.recentOpenings.slice(0, 4).filter((o) => o.endsWith("?")).length >= 2) {
    problems.push("Too many recent posts opened with a question. Do not open with one.");
  }
  if (ctx.recentBodies.slice(0, 3).some((b) => jaccard(b, body) > 0.55)) {
    problems.push("It is too similar to a recent post.");
  }

  return problems;
}

// Last resort when the only problems left are dashes and the model keeps slipping: turn long dashes into commas and
// hyphens into spaces, then the post is validated again like any other.
export function stripDashes(text: string): string {
  return text
    .replace(/\s*[\u2013\u2014\u2015]\s*/g, ", ")
    .replace(/(?<=[\p{L}\p{N}])[-\u2010\u2011\u2212](?=[\p{L}\p{N}])/gu, " ")
    .replace(/[-\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ ,/g, ",")
    .trim();
}

export function tidy(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
