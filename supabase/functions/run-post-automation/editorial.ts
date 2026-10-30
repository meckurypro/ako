// supabase/functions/run-post-automation/editorial.ts
//
// The editorial pipeline (automation_templates.id = 'editorial'): ONE account with four discovery channels. Each run
// picks a channel, resolves it to one of the existing pipelines, and the rest of the engine behaves exactly as it does
// for that pipeline.
//
//   knowledge      -> pipeline 'knowledge'  writes from the brief and the idea vault
//   research       -> pipeline 'knowledge'  no idea vault; examines a popular claim or documented fact, evidence first
//   news           -> pipeline 'news'       writes from fresh articles collected from the account's sources
//   conversations  -> pipeline 'watch'      writes about the issue behind what people on Akọ posted in the last day
//
// Channel choice: the shares in automated_accounts.news_settings (mix_knowledge, mix_news, mix_conversations,
// mix_research) are targets, not quotas. The channel furthest below its target over the last runs goes first, with a
// little jitter so the order is not mechanical. A channel with nothing to write about (no fresh stories, nothing on
// Akọ worth examining) hands over to the next one, so a slot is not lost.
//
// Pure functions, no I/O.

export const CHANNELS = ["knowledge", "news", "conversations", "research"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_PIPELINE: Record<Channel, "knowledge" | "news" | "watch"> = {
  knowledge: "knowledge",
  research: "knowledge",
  news: "news",
  conversations: "watch",
};

export function asChannel(value: unknown): Channel | null {
  return typeof value === "string" && (CHANNELS as readonly string[]).includes(value) ? (value as Channel) : null;
}

export type Mix = Record<Channel, number>;

const DEFAULT_MIX: Mix = { knowledge: 35, news: 25, conversations: 20, research: 20 };

export function readMix(raw: unknown): Mix {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown, fallback: number) => {
    if (v === null || v === undefined || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : fallback;
  };
  return {
    knowledge: num(r.mix_knowledge, DEFAULT_MIX.knowledge),
    news: num(r.mix_news, DEFAULT_MIX.news),
    conversations: num(r.mix_conversations, DEFAULT_MIX.conversations),
    research: num(r.mix_research, DEFAULT_MIX.research),
  };
}

/**
 * The channels to try, best first. `recent` is the channel of the account's latest published runs, newest first.
 * Channels with a zero share, or listed in `exclude`, are never offered.
 */
export function channelOrder(
  mix: Mix,
  recent: string[],
  exclude: Channel[] = [],
  rand: () => number = Math.random,
): Channel[] {
  const active = CHANNELS.filter((c) => mix[c] > 0 && !exclude.includes(c));
  const total = active.reduce((sum, c) => sum + mix[c], 0);
  if (!total) return [];
  const window = recent.slice(0, 20);
  return active
    .map((c) => ({
      c,
      score: mix[c] / total - (window.length ? window.filter((r) => r === c).length / window.length : 0) + rand() * 0.12,
    }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.c);
}

export const RESEARCH_EDITORIAL_RULES = `HISTORY AND RESEARCH RULES (this post comes from the research desk, whatever the account instructions say)

Pick one popular claim, narrative, loaded term or assumption about African history, economies, science, medicine or knowledge systems, and examine it. Evidence comes before opinion.

1. Say what is documented, what is contested and what is simply not known. Keep those three apart so the reader can see which is which.
2. Do not overcorrect. If a Eurocentric narrative is wrong, say specifically what is wrong with it. If a popular African narrative is not supported by the evidence, say that too. Do not manufacture greatness and do not manufacture grievance.
3. Never invent a date, figure, quote, study, scholar, source or place name. Name a historian, a work or an archive only when you are certain it exists and says what you claim. Prefer claims with broad scholarly agreement and signal their strength with words such as "historians generally agree", "the evidence suggests" or "this is disputed".
4. If you are not sure a fact is right, leave it out and make the point without it. If the topic cannot be treated honestly without facts you are unsure of, choose a different topic.
5. Treat oral tradition fairly: it is a real kind of evidence with real limits, neither proof nor nonsense. Say what kind of evidence is being used.
6. Explain why the claim matters today: what it changes about how Africans see their history, their economies or their options.
7. One claim per post. Do not turn it into a lecture or a list.`;
