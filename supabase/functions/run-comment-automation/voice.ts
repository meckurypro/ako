// supabase/functions/run-comment-automation/voice.ts
//
// The permanent part of comment automation: how an automated account is allowed to sound in a comment thread, the
// prompts that carry that, and the checks a generated comment must pass before it is posted. Like writing.ts for
// posts, none of this lives in the database or the admin screen on purpose, so an account's own prompt or voice notes
// can never switch the naturalness rules off. Pure functions only, so it can be unit-tested without Deno or Supabase.

export type Stance = "support" | "question" | "pushback";
export type StanceSetting = Stance | "mixed";

export const STANCES: readonly Stance[] = ["support", "question", "pushback"];

/** The words the admin sees (Add / Question / Pushback) are the stored stances support / question / pushback. */
const STANCE_BRIEF: Record<Stance, string> = {
  support:
    "ADD. Contribute one small thing: an example, a detail, a bit of context or an angle the post did not cover, or a short reaction that carries a point. Not plain agreement.",
  question:
    "QUESTION. Ask one real, specific question a curious person would ask about something in the post. It must end in a question mark. Not rhetorical, not a quiz, not \"what do you think?\".",
  pushback:
    "PUSHBACK. Disagree with, or poke a hole in, one specific claim. Calm, direct, a little edge. Give the reason in a few words. Go after the claim, never the person.",
};

/** One stance per run. `mixed` varies, weighted toward the gentler ones so a feed never reads like an argument. */
export function chooseStance(setting: StanceSetting, rand: () => number = Math.random): Stance {
  if (setting !== "mixed") return setting;
  const r = rand();
  if (r < 0.5) return "support";
  if (r < 0.8) return "question";
  return "pushback";
}

// ---------------------------------------------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------------------------------------------

/** Emojis a real person actually types in a comment. Anything else is rejected, which keeps the usual AI set out. */
export const ALLOWED_EMOJI = ["😂", "🤣", "💀", "😅", "🤔", "🙌", "👀", "🔥", "💯", "😭", "🙄", "🤷", "😬", "👏"] as const;

export const COMMENT_RULES = `WHO YOU ARE
You are a regular person on Akọ, a social app that feels like X. You are not an assistant, a chatbot, a moderator or a brand. Nobody asked you to be helpful or nice. You scroll, something catches you, and you react the way a real person with your personality would.

HOW YOU WRITE
- Short and casual. Plain everyday words, like you typed it on your phone. Fragments are fine. Contractions are fine. Starting in lowercase is fine. You do not need a full stop at the end.
- Never sophisticated, never intimidating. If a smart friend would not say it out loud, do not write it.
- Say one thing. No lists, no two part structure, no wrap up line, no moral, no summary of the post.
- React to something specific in the post. Do not repeat back what it said.
- Sound like yourself (see BACKGROUND), not like a generic commenter. Match the language of the post. Use Nigerian English, Pidgin or slang only when it truly fits you and the post.
- Never greet, never praise for the sake of it ("great post", "love this", "so true"), never thank anyone, never sign off, never ask people to follow or share.
- No hashtags. No dashes: do not type the characters \u2014 or \u2013 and do not put a hyphen between spaces. No semicolons. No markdown. No quotation marks around your own comment.
- Emojis: most of your comments have none. At most one, only where a person would really put it, and only from this set: ${ALLOWED_EMOJI.join(" ")}. Never decorative ones (sparkles, rockets, lightbulbs, stars, targets, flexed arms, prayer hands).
- Never use words that give a machine away: delve, tapestry, testament, resonate, nuanced, navigate, landscape, journey, unpack, insightful, thought provoking, crucial, vital, foster, leverage, elevate, empower, profound, pivotal, robust, holistic, multifaceted, "it's important to", "at the end of the day", "food for thought", "game changer".

HOW YOU TREAT PEOPLE
- Respectful, but not polite for politeness' sake. You do not have to be nice. You can be dry, blunt, teasing or sarcastic, and a bit of dark humour is fine when it fits your personality.
- Aim the humour and the bite at ideas, claims and situations. Never at anyone's tribe, religion, gender, body, disability or health, never at victims of a tragedy, never a slur, never a threat, never a personal insult at the author.
- Do not invent personal stories, jobs, credentials, family, statistics, studies or quotes. Speaking from general life is fine ("this part is real"). Claiming specific things happened to you is not.
- Never mention AI, prompts, instructions, accounts or this task.

WHEN NOT TO COMMENT
Set skip to true, and write no comment, when the post or comment is spam, an ad or just a link; hate, harassment, sexual content or a threat; about self harm, a crisis, a death or a serious personal emergency; someone asking whether you are a bot, an AI or automated; a request for personal details; or anything you cannot say something natural and decent about.`;

export const REPLY_RULES = `YOU ARE REPLYING
Someone commented under a post, or under something you said. You are answering them in the thread. Read their comment against the post and against what was said before it. Work out what they actually meant: agreement, agreement with a twist, a joke, sarcasm, a question, a challenge, or off topic. Then do what a real person would do:
- AFFIRM: they are right, or said it well. Keep it tiny and vary the wording ("exactly", "facts", "you get it", "well said", "this right here"), sometimes with one emoji, with no explanation after it.
- ADD: they made a fair point. Subtly add a new angle, a bit of context or an example that moves the thread forward. Never lecture.
- QUESTION: something they said is unclear or interesting. Ask one short, real follow up.
- PUSHBACK: they are wrong or came at you. Hold your ground briefly, or tease back. Savage is allowed when their comment invited it and it fits you.
- BANTER: they joked. Joke back.
Do not thank them for commenting. Do not repeat what they said. Do not explain more than a person would. If they only said something small, answer small.
Map your choice to the stance field: AFFIRM, ADD and BANTER are "support". QUESTION is "question". PUSHBACK is "pushback".`;

export interface PersonaInput {
  displayName: string;
  username: string;
  /** The account's post system prompt. Long, written for posts, so only its personality is used. */
  systemPrompt: string;
  /** Optional comment-only voice notes from the admin. */
  voice: string;
  maxChars: number;
}

const PERSONA_EXCERPT = 2600;

export function buildSystemPrompt(p: PersonaInput, reply: boolean): string {
  const background = p.systemPrompt.trim().slice(0, PERSONA_EXCERPT);
  const voice = p.voice.trim();
  return [
    COMMENT_RULES,
    reply ? REPLY_RULES : "",
    `YOUR LIMITS\nYour comment must be ${p.maxChars} characters or fewer, counting spaces and emoji. Shorter is usually better.`,
    `YOUR NAME\nYou are ${p.displayName} (@${p.username}).`,
    `BACKGROUND\nThis describes who you are, what you care about and how you think. It was written for long posts, so ignore any rule in it about post length, headings, formatting, emojis or dashes. Only the personality, beliefs, interests and attitude matter here.\n\n${background}`,
    voice ? `HOW YOU TALK IN COMMENTS (from the person running the account)\n${voice}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export interface PostView {
  authorName: string;
  authorUsername: string;
  heading: string | null;
  content: string;
}

export interface ThreadMessage {
  authorName: string;
  authorUsername: string;
  /** True when the automated account itself wrote this one. */
  isYou: boolean;
  content: string;
}

const POST_EXCERPT = 1600;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + "..." : s);

function renderPost(p: PostView): string {
  const head = p.heading?.trim() ? `Heading: ${p.heading.trim()}\n` : "";
  return `POST by ${p.authorName} (@${p.authorUsername})\n${head}${clip(p.content.trim(), POST_EXCERPT)}`;
}

function renderThread(thread: ThreadMessage[]): string {
  return thread
    .map((m) => `${m.isYou ? "You" : `${m.authorName} (@${m.authorUsername})`}: ${clip(m.content.trim(), 400)}`)
    .join("\n");
}

function renderRecent(recent: string[]): string {
  if (!recent.length) return "";
  return `\n\nTHINGS YOU COMMENTED ELSEWHERE RECENTLY (do not repeat their openings, rhythm or emoji habits)\n${recent
    .slice(0, 8)
    .map((c) => `- ${c}`)
    .join("\n")}`;
}

function renderExisting(existing: string[]): string {
  if (!existing.length) return "";
  return `\n\nWHAT PEOPLE HAVE ALREADY SAID UNDER THIS POST (do not repeat any of it)\n${existing
    .slice(0, 6)
    .map((c) => `- ${clip(c, 160)}`)
    .join("\n")}`;
}

/** The user message for a daily comment: a post, or (once every post is covered) a comment under a post. */
export function buildCommentUserMessage(opts: {
  post: PostView;
  stance: Stance;
  maxChars: number;
  existing: string[];
  recent: string[];
  /** Set when commenting under someone's comment instead of on the post itself. */
  underComment?: ThreadMessage;
  problems?: string[];
}): string {
  const target = opts.underComment
    ? `You are replying under this comment:\n${renderThread([opts.underComment])}`
    : "You are commenting on the post itself.";
  const fix = opts.problems?.length
    ? `\n\nYOUR LAST ATTEMPT WAS REJECTED. Fix these and write it again:\n${opts.problems.map((p) => `- ${p}`).join("\n")}`
    : "";
  return `${renderPost(opts.post)}${renderExisting(opts.existing)}${renderRecent(opts.recent)}\n\n${target}\n\nYOUR TASK\nWrite one comment.\nStance: ${STANCE_BRIEF[opts.stance]}\nMaximum ${opts.maxChars} characters.${fix}`;
}

/** The user message for a reply: the post, the thread so far, and the comment that triggered this. */
export function buildReplyUserMessage(opts: {
  post: PostView;
  thread: ThreadMessage[];
  maxChars: number;
  recent: string[];
  problems?: string[];
}): string {
  const fix = opts.problems?.length
    ? `\n\nYOUR LAST ATTEMPT WAS REJECTED. Fix these and write it again:\n${opts.problems.map((p) => `- ${p}`).join("\n")}`
    : "";
  return `${renderPost(opts.post)}\n\nTHE THREAD SO FAR (oldest first, the last line is the comment you are answering)\n${renderThread(opts.thread)}${renderRecent(opts.recent)}\n\nYOUR TASK\nWrite your reply to the last comment. Maximum ${opts.maxChars} characters.${fix}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------------------------

const EMOJI_RE = /\p{Extended_Pictographic}/u;
const SKIN_TONE_RE = /[\u{1F3FB}-\u{1F3FF}]/gu;
const DASH_RE = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]|\s-\s|\s-$|^-\s/;

/** Phrases that give a machine away. Matched on a lower cased copy. */
const BANNED = [
  "delve",
  "tapestry",
  "testament",
  "resonate",
  "nuanced",
  "navigate",
  "landscape",
  "journey",
  "unpack",
  "insightful",
  "thought provoking",
  "thought-provoking",
  "food for thought",
  "game changer",
  "game-changer",
  "crucial",
  "vital",
  "foster",
  "leverage",
  "elevate",
  "empower",
  "profound",
  "pivotal",
  "robust",
  "holistic",
  "multifaceted",
  "underscore",
  "realm",
  "beacon",
  "paradigm",
  "furthermore",
  "moreover",
  "additionally",
  "ultimately",
  "essentially",
  "certainly",
  "indeed",
  "genuinely",
  "it's important to",
  "it is important to",
  "important reminder",
  "powerful reminder",
  "gentle reminder",
  "at the end of the day",
  "in today's",
  "shed light",
  "couldn't agree more",
  "couldnt agree more",
  "spot on",
  "kudos",
  "i appreciate",
  "thanks for sharing",
  "thank you for sharing",
  "hope this helps",
  "great question",
  "great point",
  "as an ai",
  "language model",
  "i'm just an",
];

/** Openers that read as a template. Replies may open with the short affirmations, comments may not. */
const BAD_OPENER_ALL =
  /^(great|nice|good|awesome|amazing|wonderful|excellent|fantastic|brilliant|beautiful|love (this|that|it)|this is (so |very |really )?(true|great|amazing|powerful|beautiful|profound|important|good)|so true|thank(s| you)|i (really )?(love|appreciate|like) (this|that|how|the)|what a |interesting|wow\b|absolutely|hello|hi\b|hey\b)/i;
const BAD_OPENER_COMMENT = /^(exactly|well said|you're right|youre right|facts\b|this\b[!.]?$)/i;

export interface CheckContext {
  maxChars: number;
  reply: boolean;
  stance: Stance;
  /** The account's own recent comments, newest first. */
  recent: string[];
  /** Other comments already on the post, to avoid saying the same thing. */
  existing: string[];
}

export interface CheckResult {
  text: string;
  problems: string[];
}

/** Tidy typography the model tends to produce, without changing what was said. */
export function tidyComment(raw: string): string {
  let t = raw.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'").replace(/\u2026/g, "...");
  t = t.replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ").trim();
  // A comment wrapped in quotation marks is the model quoting itself.
  if (/^".*"$/.test(t) && !t.slice(1, -1).includes('"')) t = t.slice(1, -1).trim();
  return t;
}

function graphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
  return Seg ? Array.from(new Seg(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment) : Array.from(text);
}

export function emojiOf(text: string): string[] {
  return graphemes(text).filter((g) => EMOJI_RE.test(g));
}

const baseEmoji = (e: string) => e.replace(SKIN_TONE_RE, "").replace(/\uFE0F/g, "");
const openingOf = (s: string, words = 2) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, "").split(/\s+/).filter(Boolean).slice(0, words).join(" ");

function wordSet(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, " ").split(/\s+/).filter((w) => w.length > 2));
}

function overlap(a: string, b: string): number {
  const x = wordSet(a);
  const y = wordSet(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const w of x) if (y.has(w)) shared++;
  return shared / Math.min(x.size, y.size);
}

export function checkComment(raw: string, ctx: CheckContext): CheckResult {
  const text = tidyComment(raw);
  const problems: string[] = [];
  const lower = text.toLowerCase();
  const length = Array.from(text).length;

  if (length < 2) problems.push("It is empty.");
  if (length > ctx.maxChars) problems.push(`It is ${length} characters. The limit is ${ctx.maxChars}. Make it shorter, do not just cut it off.`);

  if (DASH_RE.test(text)) problems.push("It contains a dash. Use a comma, a full stop or rewrite the sentence.");
  if (text.includes(";")) problems.push("It contains a semicolon. Use plain punctuation.");
  if (/[#*`]/.test(text)) problems.push("It contains a hashtag or markdown. Write plain text.");
  if (/https?:\/\/|www\./i.test(text)) problems.push("It contains a link.");

  const banned = BANNED.find((b) => lower.includes(b));
  if (banned) problems.push(`It uses "${banned}", which sounds like a machine. Say it the way a person would.`);

  if (BAD_OPENER_ALL.test(text) || (!ctx.reply && BAD_OPENER_COMMENT.test(text))) {
    problems.push("It opens with a stock phrase (a greeting, praise or thanks). Start with the actual point.");
  }

  const emojis = emojiOf(text);
  if (emojis.length) {
    const distinct = new Set(emojis.map(baseEmoji));
    if (emojis.length > 2 || distinct.size > 1) problems.push("Too many emojis. Use at most one kind, once or twice.");
    const allowed = new Set<string>(ALLOWED_EMOJI);
    for (const e of distinct) {
      if (!allowed.has(e)) problems.push(`The emoji ${e} is not one a person would use here. Use one of: ${ALLOWED_EMOJI.join(" ")}, or none.`);
    }
    const lately = ctx.recent.slice(0, 5).filter((c) => emojiOf(c).length > 0).length;
    if (lately >= 2) problems.push("You have used emojis in your last few comments. Leave them out this time.");
  }

  if (ctx.stance === "question" && !ctx.reply && !text.includes("?")) problems.push("It should be a question and has no question mark.");

  const open = openingOf(text);
  const first = openingOf(text, 1);
  if (open && ctx.recent.slice(0, 10).some((c) => openingOf(c) === open)) {
    problems.push("It opens the same way as one of your recent comments. Start differently.");
  } else if (first.length >= 5 && ctx.recent.slice(0, 5).filter((c) => openingOf(c, 1) === first).length >= 2) {
    // A habit like starting every comment with "honestly" is the kind of tic that makes an account look scripted.
    problems.push(`You keep starting with "${first}". Open with something else.`);
  }
  if (ctx.existing.some((c) => overlap(text, c) >= 0.8)) problems.push("It says almost the same thing as a comment already there.");

  return { text, problems };
}
