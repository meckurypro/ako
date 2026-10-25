// src/pages/admin/AdminAutomationAccount.tsx
// One automated account: its writing brief (system prompt), limits, publishing schedule, idea vault and history, plus
// "generate preview" and "publish now". The natural writing rules (no emoji, no dashes, no AI tells) are enforced by
// the engine for every account and are deliberately not editable here. See supabase/ako_post_automation.sql and
// supabase/functions/run-post-automation.
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Archive, ArrowLeft, Eye, RotateCcw, Star, Trash2, Plus, X, Wand2, Send } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { Avatar } from "../../components/Avatar";
import { PostContent } from "../../components/PostContent";
import {
  AI_PROVIDERS,
  useAddAutomationIdea,
  useAutomatedAccount,
  useAutomationIdeas,
  useAutomationRuns,
  useClearAutomationApiKey,
  useDeleteAutomatedAccount,
  useDeleteAutomationIdea,
  useGenerateAutomationPreview,
  useRunAutomationNow,
  useSaveAutomationAi,
  useUpdateAutomatedAccount,
  useUpdateAutomationIdea,
  type AiProvider,
  type AutomationIdea,
  type AutomationPipeline,
  type GeneratedPreview,
  type ScheduleSlot,
} from "../../hooks/useAutomation";
import { formatInZone } from "./AdminAutomation";
import { AutomationSourcesPanel } from "./AutomationSourcesPanel";
import { friendlyError } from "../../lib/friendlyError";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const COMMON_ZONES = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Africa/Cairo",
  "Europe/London",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
];

interface SlotDraft {
  key: string;
  time: string;
  days: number[]; // empty = every day
}

function zoneList(current: string): string[] {
  let all: string[] = [];
  try {
    all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  } catch {
    all = [];
  }
  const set = new Set<string>([...COMMON_ZONES, ...all, current]);
  return [...set];
}

function toDrafts(schedule: ScheduleSlot[]): SlotDraft[] {
  return schedule.map((s, i) => ({ key: `${i}-${s.time}`, time: s.time, days: [...(s.days ?? [])] }));
}

function toSchedule(drafts: SlotDraft[]): ScheduleSlot[] {
  return drafts
    .filter((d) => /^\d{2}:\d{2}$/.test(d.time))
    .map((d) => ({ days: [...d.days].sort(), time: d.time }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

function errorMessage(err: unknown): string {
  return friendlyError(err, "Something went wrong. Please try again.");
}

// The generator's own messages (rejected key, writing rule failures, moderation) are written to be read by the admin,
// so they are shown as they are rather than collapsed by friendlyError.
function generatorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  return message ? message.slice(0, 400) : "Something went wrong. Please try again.";
}

function describeSlot(s: ScheduleSlot): string {
  if (s.days.length === 0 || s.days.length === 7) return `Every day at ${s.time}`;
  return `${s.days.map((d) => DAY_NAMES[d].slice(0, 3)).join(", ")} at ${s.time}`;
}

export function AdminAutomationAccount() {
  const { accountId } = useParams<{ accountId: string }>();
  const smartBack = useSmartBack();
  const navigate = useNavigate();

  const { data: account, isLoading } = useAutomatedAccount(accountId);
  const { data: ideas = [] } = useAutomationIdeas(accountId);
  const { data: runs = [] } = useAutomationRuns(accountId);

  const update = useUpdateAutomatedAccount();
  const deleteAccount = useDeleteAutomatedAccount();
  const addIdea = useAddAutomationIdea();
  const updateIdea = useUpdateAutomationIdea();
  const deleteIdea = useDeleteAutomationIdea();
  const generate = useGenerateAutomationPreview();
  const runNow = useRunAutomationNow();
  const saveAi = useSaveAutomationAi();
  const clearKey = useClearAutomationApiKey();

  // ---- Form state, seeded from the saved account ---------------------------------------------------------------
  const [prompt, setPrompt] = useState("");
  const [maxPost, setMaxPost] = useState(450);
  const [maxHeader, setMaxHeader] = useState(50);
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [pipeline, setPipeline] = useState<AutomationPipeline>("knowledge");
  const [lookback, setLookback] = useState(36);
  const [minOutlets, setMinOutlets] = useState(2);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  useEffect(() => {
    if (account && seededFor !== account.id) {
      setPrompt(account.system_prompt);
      setMaxPost(account.max_post_chars);
      setMaxHeader(account.max_heading_chars);
      setTimezone(account.timezone);
      setSlots(toDrafts(account.schedule ?? []));
      setPipeline(account.pipeline ?? "knowledge");
      setLookback(account.news_settings?.lookback_hours ?? 36);
      setMinOutlets(account.news_settings?.min_sources ?? 2);
      setSeededFor(account.id);
    }
  }, [account, seededFor]);

  // AI provider settings. The key box is write only: a saved key can't be read back, only replaced or removed.
  const [provider, setProvider] = useState<AiProvider>("anthropic");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [aiMessage, setAiMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    if (account) {
      setProvider(account.ai_provider);
      setModel(account.ai_model ?? "");
    }
  }, [account?.id, account?.ai_provider, account?.ai_model]);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ postId: string } | null>(null);
  const [preview, setPreview] = useState<GeneratedPreview | null>(null);

  const [ideaText, setIdeaText] = useState("");
  const [ideaHigh, setIdeaHigh] = useState(false);
  const [ideaError, setIdeaError] = useState<string | null>(null);
  const [ideaTab, setIdeaTab] = useState<AutomationIdea["status"]>("pending");

  const newsSettings = useMemo(
    () => ({
      ...(account?.news_settings ?? {}),
      lookback_hours: Math.min(120, Math.max(6, Math.round(lookback) || 36)),
      min_sources: Math.min(5, Math.max(1, Math.round(minOutlets) || 2)),
    }),
    [account?.news_settings, lookback, minOutlets],
  );

  const dirty = useMemo(() => {
    if (!account) return false;
    return (
      pipeline !== (account.pipeline ?? "knowledge") ||
      (pipeline === "news" &&
        (newsSettings.lookback_hours !== (account.news_settings?.lookback_hours ?? 36) ||
          newsSettings.min_sources !== (account.news_settings?.min_sources ?? 2))) ||
      prompt !== account.system_prompt ||
      maxPost !== account.max_post_chars ||
      maxHeader !== account.max_heading_chars ||
      timezone !== account.timezone ||
      JSON.stringify(toSchedule(slots)) !== JSON.stringify(account.schedule ?? [])
    );
  }, [account, prompt, maxPost, maxHeader, timezone, slots, pipeline, newsSettings]);

  const zones = useMemo(() => zoneList(account?.timezone ?? "Africa/Lagos"), [account?.timezone]);

  if (isLoading) return <p className="text-ink-muted text-center py-10">Loading…</p>;
  if (!account) {
    return (
      <div className="min-h-screen bg-canvas px-4 pt-8">
        <p className="text-ink-muted text-center">This automated account doesn’t exist any more.</p>
        <Link to="/admin/automation" className="block text-center text-accent mt-3">
          Back to Automate posts
        </Link>
      </div>
    );
  }

  const profile = account.profile;

  async function handleSave(e?: FormEvent) {
    e?.preventDefault();
    setSaveError(null);
    try {
      await update.mutateAsync({
        id: account!.id,
        patch: {
          system_prompt: prompt.trim(),
          max_post_chars: Math.min(1200, Math.max(50, Math.round(maxPost) || 450)),
          max_heading_chars: Math.min(50, Math.max(10, Math.round(maxHeader) || 50)),
          timezone,
          schedule: toSchedule(slots),
          pipeline,
          news_settings: pipeline === "news" ? newsSettings : (account!.news_settings ?? {}),
        },
      });
      // Re-seed from what was saved (the DB clamps nothing, but we do).
      setSeededFor(null);
    } catch (err) {
      setSaveError(errorMessage(err));
    }
  }

  // The account type decides which settings the rest of this screen shows, so it saves on its own the moment it
  // changes instead of waiting for the form's Save button.
  async function handlePipelineChange(next: AutomationPipeline) {
    if (next === (account!.pipeline ?? "knowledge")) return;
    setPipelineError(null);
    setPipeline(next);
    try {
      await update.mutateAsync({
        id: account!.id,
        patch: { pipeline: next, news_settings: next === "news" ? newsSettings : (account!.news_settings ?? {}) },
      });
    } catch (err) {
      setPipeline(account!.pipeline ?? "knowledge");
      setPipelineError(errorMessage(err));
    }
  }

  async function handleToggle() {
    setToggleError(null);
    if (!account!.is_enabled) {
      if (dirty) return setToggleError("Save your changes first, then turn it on.");
      if (!account!.system_prompt.trim()) return setToggleError("Write the account’s brief first.");
      if ((account!.schedule ?? []).length === 0) return setToggleError("Add at least one publishing time first.");
      if (!account!.api_key_last4) return setToggleError("Save an AI provider key first.");
    }
    try {
      await update.mutateAsync({ id: account!.id, patch: { is_enabled: !account!.is_enabled } });
    } catch (err) {
      setToggleError(errorMessage(err));
    }
  }

  async function handleSaveAi() {
    setAiMessage(null);
    const switching = provider !== account!.ai_provider;
    if (
      switching &&
      !apiKey.trim() &&
      account!.api_key_last4 &&
      !window.confirm("Switching provider without a new key removes the saved key and pauses this account. Continue?")
    ) {
      return;
    }
    try {
      const result = await saveAi.mutateAsync({ accountId: account!.id, provider, model, apiKey });
      setApiKey("");
      setAiMessage({
        text: result.key_saved
          ? "Key saved."
          : result.key_removed
            ? "Provider changed. The old key was removed, so paste a key for the new provider."
            : "Saved.",
        error: false,
      });
    } catch (err) {
      setAiMessage({ text: errorMessage(err), error: true });
    }
  }

  async function handleRemoveKey() {
    if (!window.confirm("Remove the saved key? This also pauses the account.")) return;
    setAiMessage(null);
    try {
      await clearKey.mutateAsync(account!.id);
      setAiMessage({ text: "Key removed.", error: false });
    } catch (err) {
      setAiMessage({ text: errorMessage(err), error: true });
    }
  }

  async function handleGenerate() {
    setActionError(null);
    setNotice(null);
    setPreview(null);
    try {
      const result = await generate.mutateAsync(account!.id);
      setPreview(result.post);
    } catch (err) {
      setActionError(generatorMessage(err));
    }
  }

  async function handlePublish(draft?: GeneratedPreview) {
    if (!window.confirm(draft ? "Publish this post now?" : "Write and publish a post now?")) return;
    setActionError(null);
    setNotice(null);
    try {
      const result = await runNow.mutateAsync({ accountId: account!.id, draft });
      setPreview(null);
      setNotice({ postId: result.post_id });
    } catch (err) {
      setActionError(generatorMessage(err));
    }
  }

  async function handleAddIdea(e: FormEvent) {
    e.preventDefault();
    const cleaned = ideaText.trim();
    if (!cleaned) return;
    setIdeaError(null);
    try {
      await addIdea.mutateAsync({ accountId: account!.id, idea: cleaned, priority: ideaHigh ? "high" : "normal" });
      setIdeaText("");
      setIdeaHigh(false);
      setIdeaTab("pending");
    } catch (err) {
      setIdeaError(errorMessage(err));
    }
  }

  async function handleRemove() {
    if (
      !window.confirm(
        `Stop automating @${profile?.username ?? "this account"}? Its posts stay. The brief, ideas and history are deleted.`,
      )
    )
      return;
    try {
      await deleteAccount.mutateAsync(account!.id);
      navigate("/admin/automation", { replace: true });
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  function setSlot(key: string, patch: Partial<SlotDraft>) {
    setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function toggleDay(slot: SlotDraft, day: number) {
    const has = slot.days.includes(day);
    const next = has ? slot.days.filter((d) => d !== day) : [...slot.days, day];
    setSlot(slot.key, { days: next.length === 7 ? [] : next });
  }

  const shownIdeas = ideas.filter((i) => i.status === ideaTab);
  const pendingCount = ideas.filter((i) => i.status === "pending").length;
  const busy = generate.isPending || runNow.isPending;
  const maxBodyShown = Math.min(maxPost, profile?.is_verified ? 1200 : 450);

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-16">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={smartBack} className="text-ink-muted" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Automate posts</h2>
        </div>

        {/* Account + on/off */}
        <div className="flex items-center gap-3 bg-surface rounded-xl p-3 border border-border mb-1">
          <Avatar src={profile?.avatar_url} name={profile?.display_name ?? "?"} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-ink truncate">{profile?.display_name ?? "Unknown account"}</p>
            <p className="text-xs text-ink-muted truncate">@{profile?.username ?? "unknown"}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={account.is_enabled}
            aria-label={account.is_enabled ? "Pause automation" : "Turn automation on"}
            onClick={handleToggle}
            disabled={update.isPending}
            className={`relative w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${
              account.is_enabled ? "bg-accent" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-canvas transition-all ${
                account.is_enabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-ink-muted mb-1">
          {account.is_enabled
            ? `Active. Next post ${formatInZone(account.next_run_at, account.timezone)}.`
            : "Paused. Nothing will be published until you turn it on."}
        </p>
        {toggleError && <p className="text-xs text-danger mb-1">{toggleError}</p>}

        {/* Account type */}
        <section className="mt-6">
          <h3 className="text-sm font-medium text-ink mb-1">Account type</h3>
          <select
            value={pipeline}
            onChange={(e) => handlePipelineChange(e.target.value as AutomationPipeline)}
            disabled={update.isPending}
            aria-label="Account type"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-ink disabled:opacity-50"
          >
            <option value="knowledge">Knowledge (writes from a brief and an idea vault)</option>
            <option value="news">News (writes from collected articles)</option>
          </select>
          <p className="text-xs text-ink-muted mt-2">
            {pipeline === "news"
              ? "Collects fresh articles from the sources below, groups them into stories, writes about stories not yet covered and adds a sources line to each post. The idea vault isn’t used."
              : "Writes from the brief below and the idea vault, with no outside sources."}
          </p>
          {pipelineError && <p className="text-xs text-danger mt-1">{pipelineError}</p>}
        </section>

        {/* AI provider */}
        <section className="mt-6">
          <h3 className="text-sm font-medium text-ink mb-1">AI provider</h3>
          <p className="text-xs text-ink-muted mb-2">
            This account writes with its own key and is billed to it. The key is stored encrypted and can’t be read
            back, only replaced or removed.
          </p>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-ink-muted">Provider</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as AiProvider)}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-ink"
              >
                {AI_PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">
                API key
                {account.api_key_last4 ? ` (saved, ends in ${account.api_key_last4})` : " (none saved)"}
              </span>
              <input
                type="password"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={account.api_key_last4 ? "Paste a new key to replace it" : "Paste the key"}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-ink"
              />
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Model (optional)</span>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={`Default: ${AI_PROVIDERS.find((p) => p.value === provider)?.defaultModel ?? ""}`}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-ink"
              />
            </label>
          </div>
          {provider !== account.ai_provider && account.api_key_last4 && !apiKey.trim() && (
            <p className="text-xs text-ink-muted mt-2">
              Switching provider without a new key removes the saved key and pauses this account.
            </p>
          )}
          {aiMessage && (
            <p className={`text-xs mt-2 ${aiMessage.error ? "text-danger" : "text-ink-muted"}`}>{aiMessage.text}</p>
          )}
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={handleSaveAi}
              disabled={
                saveAi.isPending ||
                (!apiKey.trim() &&
                  provider === account.ai_provider &&
                  model.trim() === (account.ai_model ?? ""))
              }
              className="flex-1 bg-accent text-canvas rounded-xl py-2.5 text-sm font-medium disabled:opacity-40"
            >
              {saveAi.isPending ? "Saving…" : "Save AI settings"}
            </button>
            {account.api_key_last4 && (
              <button
                type="button"
                onClick={handleRemoveKey}
                disabled={clearKey.isPending}
                className="border border-border text-danger rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-40"
              >
                Remove key
              </button>
            )}
          </div>
        </section>

        {account.pipeline === "news" && <AutomationSourcesPanel accountId={account.id} timezone={account.timezone} />}

        <form onSubmit={handleSave} className="mt-6 space-y-6">
          {/* Brief */}
          <section>
            <h3 className="text-sm font-medium text-ink mb-1">{pipeline === "news" ? "Editorial brief" : "System prompt"}</h3>
            <p className="text-xs text-ink-muted mb-2">
              {pipeline === "news"
                ? "The beat, voice, audience, what to lead with and what to leave out. Facts always come from the collected articles, and the natural writing rules (no emoji, no dashes, no AI sounding phrasing) apply automatically."
                : "The niche, voice, audience, viewpoint, boundaries and what each post should achieve. Natural writing rules (no emoji, no dashes, no AI sounding phrasing) are applied to every account automatically."}
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={9}
              maxLength={6000}
              placeholder={
                pipeline === "news"
                  ? "You are the news desk for an African audience. Lead with what changes people’s lives, explain it plainly…"
                  : "You are a psychology educator who explores human behaviour, relationships and everyday patterns…"
              }
              className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink text-sm leading-relaxed"
            />
            <p className="text-xs text-ink-muted text-right">{prompt.length}/6000</p>
          </section>

          {/* News settings */}
          {pipeline === "news" && (
            <section>
              <h3 className="text-sm font-medium text-ink mb-1">News settings</h3>
              <p className="text-xs text-ink-muted mb-2">
                How far back to look for articles, and how many different outlets must report a story before it is used.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <label className="block">
                  <span className="text-xs text-ink-muted">Look back (hours)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={6}
                    max={120}
                    value={lookback}
                    onChange={(e) => setLookback(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-ink"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-ink-muted">Outlets to trust a story</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={5}
                    value={minOutlets}
                    onChange={(e) => setMinOutlets(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-ink"
                  />
                </label>
              </div>
            </section>
          )}

          {/* Limits */}
          <section>
            <h3 className="text-sm font-medium text-ink mb-2">Limits</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-ink-muted">Max post characters</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={50}
                  max={1200}
                  value={maxPost}
                  onChange={(e) => setMaxPost(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-ink"
                />
              </label>
              <label className="block">
                <span className="text-xs text-ink-muted">Max header characters</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={10}
                  max={50}
                  value={maxHeader}
                  onChange={(e) => setMaxHeader(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-ink"
                />
              </label>
            </div>
            <p className="text-xs text-ink-muted mt-2">
              Akọ caps posts at 450 characters, or 1,200 for verified accounts, and headers at 50.{" "}
              {profile?.is_verified ? "This account is verified." : "This account isn’t verified."} Posts will stay
              within {maxBodyShown}.
            </p>
          </section>

          {/* Schedule */}
          <section>
            <h3 className="text-sm font-medium text-ink mb-2">Publishing schedule</h3>
            <label className="block mb-3">
              <span className="text-xs text-ink-muted">Timezone</span>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-ink"
              >
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-3">
              {slots.map((slot) => (
                <div key={slot.key} className="bg-surface rounded-xl p-3 border border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="time"
                      value={slot.time}
                      onChange={(e) => setSlot(slot.key, { time: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-border bg-canvas text-ink"
                    />
                    <button
                      type="button"
                      onClick={() => setSlot(slot.key, { days: [] })}
                      className={`text-xs rounded-full px-3 py-1.5 border ${
                        slot.days.length === 0 ? "bg-accent text-canvas border-accent" : "border-border text-ink-muted"
                      }`}
                    >
                      Every day
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlots((prev) => prev.filter((s) => s.key !== slot.key))}
                      aria-label="Remove time"
                      className="ml-auto text-ink-muted"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    {DAY_LABELS.map((label, day) => {
                      const on = slot.days.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          aria-label={DAY_NAMES[day]}
                          aria-pressed={on}
                          onClick={() => toggleDay(slot, day)}
                          className={`flex-1 h-9 rounded-lg text-xs font-medium border ${
                            on ? "bg-accent text-canvas border-accent" : "border-border text-ink-muted"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={slots.length >= 12}
              onClick={() =>
                setSlots((prev) => [...prev, { key: `new-${Date.now()}-${prev.length}`, time: "09:00", days: [] }])
              }
              className="mt-3 w-full border border-dashed border-border rounded-xl py-2.5 text-sm text-ink flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Plus size={16} /> Add a time
            </button>
            {toSchedule(slots).length > 0 && (
              <ul className="text-xs text-ink-muted mt-3 space-y-0.5">
                {toSchedule(slots).map((s, i) => (
                  <li key={`${s.time}-${i}`}>{describeSlot(s)}</li>
                ))}
              </ul>
            )}
          </section>

          {saveError && <p className="text-xs text-danger">{saveError}</p>}
          <button
            type="submit"
            disabled={!dirty || update.isPending}
            className="w-full bg-accent text-canvas rounded-xl py-3 font-medium disabled:opacity-40"
          >
            {update.isPending ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
        </form>

        {/* Try it */}
        <section className="mt-8">
          <h3 className="text-sm font-medium text-ink mb-1">Try it</h3>
          <p className="text-xs text-ink-muted mb-3">
            Preview writes a post without publishing it. Publishing uses the saved brief, so save first.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={busy || dirty || !account.system_prompt.trim() || !account.api_key_last4}
              className="flex-1 border border-border text-ink rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Eye size={16} /> {generate.isPending ? "Writing…" : "Generate preview"}
            </button>
            <button
              type="button"
              onClick={() => handlePublish()}
              disabled={busy || dirty || !account.system_prompt.trim() || !account.api_key_last4}
              className="flex-1 border border-border text-ink rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Send size={16} /> {runNow.isPending && !preview ? "Publishing…" : "Publish now"}
            </button>
          </div>
          {dirty && <p className="text-xs text-ink-muted mt-2">Save your changes to use these.</p>}
          {!account.api_key_last4 && (
            <p className="text-xs text-ink-muted mt-2">Save an AI provider key above to use these.</p>
          )}
          {actionError && <p className="text-xs text-danger mt-2">{actionError}</p>}
          {notice && (
            <p className="text-sm text-ink bg-surface rounded-xl p-3 border border-border mt-3">
              Published.{" "}
              <Link to={`/post/${notice.postId}`} className="text-accent">
                View the post
              </Link>
            </p>
          )}
          {preview && (
            <div className="bg-surface rounded-xl p-4 border border-border mt-3 space-y-2">
              <PostContent heading={preview.header} headingColor={preview.heading_color} content={preview.body} />
              <p className="text-xs text-ink-muted">
                {preview.mode} · {preview.topic} · {preview.header.length}/{maxHeader} header, {preview.body.length}/
                {maxBodyShown} body
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handlePublish(preview)}
                  disabled={busy}
                  className="flex-1 bg-accent text-canvas rounded-lg py-2 text-sm font-medium disabled:opacity-50"
                >
                  Publish this
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={busy}
                  className="flex-1 border border-border text-ink rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Wand2 size={15} /> Regenerate
                </button>
              </div>
              {preview.source_idea_id && (
                <p className="text-xs text-ink-muted">Uses the next idea in the vault. It is marked used once published.</p>
              )}
            </div>
          )}
        </section>

        {/* Idea vault (news accounts write from collected articles instead) */}
        {pipeline === "knowledge" && (
          <section className="mt-8">
            <h3 className="text-sm font-medium text-ink mb-1">
              Idea vault{pendingCount > 0 ? ` (${pendingCount} waiting)` : ""}
            </h3>
            <p className="text-xs text-ink-muted mb-3">
              Rough thoughts the account turns into posts, high priority first, then oldest. With none waiting, it writes
              from its recent posts and what followers comment on.
            </p>
            <form onSubmit={handleAddIdea} className="space-y-2 mb-3">
              <textarea
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="A random thought, topic or question…"
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink text-sm"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIdeaHigh((v) => !v)}
                  aria-pressed={ideaHigh}
                  className={`text-xs rounded-full px-3 py-1.5 border flex items-center gap-1 ${
                    ideaHigh ? "bg-accent text-canvas border-accent" : "border-border text-ink-muted"
                  }`}
                >
                  <Star size={13} /> High priority
                </button>
                <button
                  type="submit"
                  disabled={addIdea.isPending || !ideaText.trim()}
                  className="ml-auto bg-accent text-canvas rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40"
                >
                  Add idea
                </button>
              </div>
              {ideaError && <p className="text-xs text-danger">{ideaError}</p>}
            </form>

            <div className="flex gap-2 mb-3">
              {(["pending", "used", "archived"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setIdeaTab(tab)}
                  className={`text-xs rounded-full px-3 py-1.5 border capitalize ${
                    ideaTab === tab ? "bg-accent text-canvas border-accent" : "border-border text-ink-muted"
                  }`}
                >
                  {tab === "pending" ? "Waiting" : tab}
                </button>
              ))}
            </div>

            {shownIdeas.length === 0 ? (
              <p className="text-sm text-ink-muted bg-surface rounded-xl p-3 border border-border">Nothing here.</p>
            ) : (
              <div className="space-y-2">
                {shownIdeas.map((idea) => (
                  <div key={idea.id} className="bg-surface rounded-xl p-3 border border-border">
                    <p className="text-sm text-ink whitespace-pre-wrap">{idea.idea}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-[11px] text-ink-muted">
                        {idea.status === "used" && idea.used_at
                          ? `Used ${formatInZone(idea.used_at, account.timezone)}`
                          : `Added ${formatInZone(idea.created_at, account.timezone)}`}
                        {idea.priority === "high" ? " · High priority" : ""}
                      </span>
                      <span className="ml-auto flex items-center gap-1">
                        {idea.used_post_id && (
                          <Link to={`/post/${idea.used_post_id}`} className="text-xs text-accent px-2">
                            Post
                          </Link>
                        )}
                        {idea.status === "pending" && (
                          <button
                            type="button"
                            aria-label={idea.priority === "high" ? "Make normal priority" : "Make high priority"}
                            onClick={() =>
                              updateIdea.mutate({
                                id: idea.id,
                                patch: { priority: idea.priority === "high" ? "normal" : "high" },
                              })
                            }
                            className={`p-1.5 ${idea.priority === "high" ? "text-accent" : "text-ink-muted"}`}
                          >
                            <Star size={16} />
                          </button>
                        )}
                        {idea.status === "pending" ? (
                          <button
                            type="button"
                            aria-label="Archive idea"
                            onClick={() => updateIdea.mutate({ id: idea.id, patch: { status: "archived" } })}
                            className="p-1.5 text-ink-muted"
                          >
                            <Archive size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label="Put back in the vault"
                            onClick={() => updateIdea.mutate({ id: idea.id, patch: { status: "pending" } })}
                            className="p-1.5 text-ink-muted"
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label="Delete idea"
                          onClick={() => {
                            if (window.confirm("Delete this idea?")) deleteIdea.mutate(idea.id);
                          }}
                          className="p-1.5 text-ink-muted"
                        >
                          <Trash2 size={16} />
                        </button>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* History */}
        <section className="mt-8">
          <h3 className="text-sm font-medium text-ink mb-2">History</h3>
          {runs.length === 0 ? (
            <p className="text-sm text-ink-muted bg-surface rounded-xl p-3 border border-border">No runs yet.</p>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => (
                <div key={run.id} className="bg-surface rounded-xl p-3 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${
                        run.status === "published"
                          ? "bg-accent text-canvas"
                          : run.status === "failed"
                            ? "bg-danger text-canvas"
                            : "border border-border text-ink-muted"
                      }`}
                    >
                      {run.status}
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      {formatInZone(run.created_at, account.timezone)} · {run.trigger === "manual" ? "manual" : "scheduled"}
                    </span>
                    {run.post_id && (
                      <Link to={`/post/${run.post_id}`} className="ml-auto text-xs text-accent">
                        View post
                      </Link>
                    )}
                  </div>
                  {run.header && <p className="text-sm font-medium text-ink">{run.header}</p>}
                  {run.error && <p className="text-xs text-danger mt-0.5">{run.error}</p>}
                  {(run.input_tokens > 0 || run.output_tokens > 0) && (
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {run.attempts} attempt{run.attempts === 1 ? "" : "s"} · {run.input_tokens} in, {run.output_tokens} out
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={handleRemove}
          className="mt-10 w-full border border-border text-danger rounded-xl py-2.5 text-sm font-medium"
        >
          Stop automating this account
        </button>
      </div>
    </div>
  );
}
