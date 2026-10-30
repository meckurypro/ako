// supabase/functions/run-post-automation/network.ts
//
// Cross account editorial coordination. Each automated account already avoids repeating ITS OWN recent posts
// (index.ts buildContext + writing.ts validatePost). This file makes the accounts aware of each other: what the other
// knowledge accounts published in the last NETWORK_WINDOW_DAYS days is shown to the model AND enforced as a hard check,
// because a prompt instruction alone is not reliable.
//
// Three layers, strongest first (every layer is a hard rejection that is fed back to the model for another attempt):
//   1. Named references. The model lists the people, works, events or named ideas a post is built on (key_references).
//      A post is rejected if another account already used the same one, or if it names one of the other account's
//      proper-name references in its own text, even when the model forgot to list it.
//   2. Topic and angle similarity against the other accounts' topic history.
//   3. Wording similarity against the other accounts' published bodies (two accounts retelling the same source).
//
// Pure functions, no I/O: unit-testable in node or deno.

export const NETWORK_WINDOW_DAYS = 14;

const TOPIC_SIMILARITY_LIMIT = 0.34;
// Overlap coefficient (shared / smaller set), so a short post retelling a long one still scores high.
// Calibrated on real Akọ posts: unrelated pairs score 0.00 to 0.17, a paraphrased retelling scores 0.67.
const BODY_OVERLAP_LIMIT = 0.3;
const MAX_REFS = 6;
const MAX_PROBLEMS = 3;

export interface NetworkEntry {
  /** The other account's username, without the @. */
  handle: string;
  topic: string;
  angle: string | null;
  key_refs: string[];
  /** Published body text, when the post still exists. */
  body: string | null;
  created_at: string;
}

export interface NetworkCheckable {
  header: string;
  body: string;
  topic: string;
  content_angle: string;
  key_refs?: string[];
}

const STOPWORDS = new Set(
  "the and for with from that this these those not but are was were been being has have had its into over under about every each own most some any such very much many other which while though through between what when where who whom how why your you our their them they then than there here can does did just only also more out off him her his she will would could should may might must one two like even still yet".split(
    " ",
  ),
);

// Countries, regions and other umbrella names say nothing about overlap. Several accounts write about Africa or Nigeria
// all the time, so these never count as a shared reference.
const BROAD_REFS = new Set(
  "africa african africans nigeria nigerian nigerians lagos abuja ghana kenya ethiopia egypt tanzania south africa west africa east africa europe asia america usa united states china india world".split(
    " ",
  ),
);

export function norm(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of norm(text).split(" ")) if (w.length >= 3 && !STOPWORDS.has(w)) out.add(w);
  return out;
}

export function similarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / (a.size + b.size - shared);
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / Math.min(a.size, b.size);
}

function isBroad(ref: string): boolean {
  return BROAD_REFS.has(norm(ref));
}

/** Whatever the model (or a stored draft) returned for key_references, reduced to a short clean list. */
export function cleanRefs(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const ref = String(item ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
    const key = norm(ref);
    if (key.length < 3 || seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
    if (out.length >= MAX_REFS) break;
  }
  return out;
}

/** The problems that make a post a repeat of something another account published recently. Empty means it is fresh. */
export function networkProblems(post: NetworkCheckable, network: NetworkEntry[]): string[] {
  if (!network.length) return [];

  const plain = `${post.header}\n${post.body}`.replace(/[*_]/g, "");
  const haystack = ` ${norm(plain)} `;
  const myRefs = new Set((post.key_refs ?? []).filter((r) => !isBroad(r)).map(norm));
  const myTopic = tokens(`${post.topic} ${post.content_angle}`);
  const myBody = tokens(plain);
  const problems: string[] = [];

  for (const e of network) {
    const when = e.created_at.slice(0, 10);
    const refs = e.key_refs.filter((r) => !isBroad(r));

    const shared = refs.find((r) => myRefs.has(norm(r)));
    const mentioned =
      shared ?? refs.find((r) => /^\p{Lu}/u.test(r) && norm(r).length >= 4 && haystack.includes(` ${norm(r)} `));
    if (mentioned) {
      problems.push(
        `@${e.handle} already covered "${mentioned}" on ${when}. Choose a different person, work, event or idea. A new angle on the same one is not enough.`,
      );
      continue;
    }

    if (similarity(myTopic, tokens(`${e.topic} ${e.angle ?? ""}`)) >= TOPIC_SIMILARITY_LIMIT) {
      problems.push(`The topic is too close to what @${e.handle} posted on ${when}: "${e.topic}". Pick a different subject.`);
      continue;
    }

    if (e.body && overlap(myBody, tokens(e.body)) >= BODY_OVERLAP_LIMIT) {
      problems.push(`The wording and ideas are too close to a post by @${e.handle} on ${when} ("${e.topic}"). Write about something else.`);
    }
  }
  return [...new Set(problems)].slice(0, MAX_PROBLEMS);
}

/** The prompt block that shows the model what the other accounts have already covered. */
export function renderNetwork(network: NetworkEntry[], limit = 40): string {
  return network
    .slice(0, limit)
    .map((e) => `@${e.handle} | ${e.topic}${e.angle ? ` | ${e.angle}` : ""}${e.key_refs.length ? ` | refs: ${e.key_refs.join(", ")}` : ""}`)
    .join("\n");
}
