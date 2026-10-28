// src/pages/admin/AdminAutomationAccount.tsx
// One automated account. The page is the same for every account (writing, AI provider, schedule, preview, history); what
// differs is the template it uses, which comes from the catalog (supabase/ako_automation_catalog.sql) and decides which
// extra panels and settings appear. Nothing here names a template or a news provider. The natural writing rules (no
// emoji, no dashes, no AI tells) are enforced by the engine for every account and are deliberately not editable here.
// See supabase/ako_post_automation.sql and supabase/functions/run-post-automation.
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
  useAutomationCatalog,
  useAutomationIdeas,
  useAutomationLikeLog,
  useLikeNow,
  useAutomationRuns,
  useAutomationSources,
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
  type GeneratedPreview,
  type ScheduleSlot,
  type TemplateSetting,
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

function clampInt(value: number, min: number, max: number, fallback: number): number {
  return Math.min(max, Math.max(min, Math.round(value) || fallback));
}

// A template setting as it will be saved: the edit if there is one, else the saved value, else the default, kept
// inside the template's own range.
function settingNow(field: TemplateSetting, edits: Record<string, number>, saved: Record<string, unknown>): number {
  const stored = saved[field.key];
  const raw = edits[field.key] ?? (typeof stored === "number" ? stored : field.default);
  return clampInt(raw, field.min, field.max, field.default);
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
  const { data: likeLog = [] } = useAutomationLikeLog(accountId);
  const { data: catalog } = useAutomationCatalog();
  const { data: sources = [] } = useAutomationSources(accountId);

  const update = useUpdateAutomatedAccount();
  const deleteAccount = useDeleteAutomatedAccount();
  const addIdea = useAddAutomationIdea();
  const updateIdea = useUpdateAutomationIdea();
  const deleteIdea = useDeleteAutomationIdea();
  const generate = useGenerateAutomationPreview();
  const runNow = useRunAutomationNow();
  const likeNow = useLikeNow();
  const saveAi = useSaveAutomationAi();
  const clearKey = useClearAutomationApiKey();

  // ---- Form state, seeded from the saved account ---------------------------------------------------------------
  const [prompt, setPrompt] = useState("");
  const [maxPost, setMaxPost] = useState(450);
  const [maxHeader, setMaxHeader] = useState(50);
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [likeEnabled, setLikeEnabled] = useState(false);
  const [likeTime, setLikeTime] = useState("12:00");
  const [likeMessage, setLikeMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [settingEdits, setSettingEdits] = useState<Record<string, number>>({});
  const [chosenTemplate, setChosenTemplate] = useState<string | null>(null);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  useEffect(() => {
    if (account && seededFor !== account.id) {
      setPrompt(account.system_prompt);
      setMaxPost(account.max_post_chars);
      setMaxHeader(account.max_heading_chars);
      setTimezone(account.timezone);
      setSlots(toDrafts(account.schedule ?? []));
      setLikeEnabled(account.daily_like_enabled);
      setLikeTime(account.daily_like_time);
      setSettingEdits({});
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

  // The template this account uses, from the catalog. It is saved the moment it changes, so it is not part of "dirty".
  const templateId = chosenTemplate ?? account?.pipeline ?? "";
  const template = catalog?.templates.find((t) => t.id === templateId);
  const templateSettings = template?.settings ?? [];
  const templateOptions = template || !templateId ? (catalog?.templates ?? []) : [...(catalog?.templates ?? []), { id: templateId, label: templateId }];

  // Unsaved changes are judged on what would actually be saved (trimmed, clamped, sorted), never on raw text, so
  // trimming a prompt or reordering times can't leave the form looking unsaved after a save.
  const dirty = useMemo(() => {
    if (!account || seededFor !== account.id) return false;
    const savedSettings = account.news_settings ?? {};
    const savedSchedule = toSchedule(toDrafts(account.schedule ?? []));
    return (
      prompt.trim() !== account.system_prompt.trim() ||
      clampInt(maxPost, 50, 1200, 450) !== account.max_post_chars ||
      clampInt(maxHeader, 10, 50, 50) !== account.max_heading_chars ||
      timezone !== account.timezone ||
      likeEnabled !== account.daily_like_enabled ||
      likeTime !== account.daily_like_time ||
      JSON.stringify(toSchedule(slots)) !== JSON.stringify(savedSchedule) ||
      templateSettings.some((f) => settingNow(f, settingEdits, savedSettings) !== settingNow(f, {}, savedSettings))
    );
  }, [account, seededFor, prompt, maxPost, maxHeader, timezone, slots, likeEnabled, likeTime, settingEdits, templateSettings]);

  // What is still missing before the account can be switched on. Shown as a list, so there are no cryptic errors.
  const missing: string[] = [];
  if (account) {
    if (!prompt.trim() && !account.system_prompt.trim()) missing.push("Write the brief");
    if (!account.api_key_last4) missing.push("Save an AI provider key");
    if ((account.schedule ?? []).length === 0 && toSchedule(slots).length === 0) missing.push("Add a publishing time");
    if (template?.uses_sources && !sources.some((src) => src.is_enabled)) missing.push("Switch on at least one source");
    if (dirty) missing.push("Save your changes");
  }
  const ready = missing.length === 0;

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
    setToggleError(null);
    const next = {
      system_prompt: prompt.trim(),
      max_post_chars: clampInt(maxPost, 50, 1200, 450),
      max_heading_chars: clampInt(maxHeader, 10, 50, 50),
      timezone,
      schedule: toSchedule(slots),
      daily_like_enabled: likeEnabled,
      daily_like_time: likeTime || "12:00",
    };
    const savedSettings = account!.news_settings ?? {};
    const settingsPatch: Record<string, number> = {};
    for (const f of templateSettings) settingsPatch[f.key] = settingNow(f, settingEdits, savedSettings);
    try {
      await update.mutateAsync({
        id: account!.id,
        patch: {
          ...next,
          ...(templateSettings.length ? { news_settings: { ...savedSettings, ...settingsPatch } } : {}),
        },
      });
      // The form now shows exactly what was saved. Reloading it from the cached account here would bring back the
      // old values and leave the page claiming there is something to save.
      setPrompt(next.system_prompt);
      setMaxPost(next.max_post_chars);
      setMaxHeader(next.max_heading_chars);
      setSlots(toDrafts(next.schedule));
      setLikeTime(next.daily_like_time);
      setSettingEdits(settingsPatch);
    } catch (err) {
      setSaveError(errorMessage(err));
    }
  }

  // The template decides which panels this screen shows, so it saves on its own the moment it changes.
  async function handleTemplateChange(next: string) {
    if (next === account!.pipeline) return;
    setPipelineError(null);
    setChosenTemplate(next);
    try {
      await update.mutateAsync({ id: account!.id, patch: { pipeline: next } });
    } catch (err) {
      setPipelineError(errorMessage(err));
    } finally {
      setChosenTemplate(null);
    }
  }

  async function handleToggle() {
    setToggleError(null);
    if (!account!.is_enabled && !ready) return;
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

  async function handleLikeNow() {
    setLikeMessage(null);
    try {
      const res = await likeNow.mutateAsync(account!.id);
      if (res.status === "liked") setLikeMessage({ text: res.target_type === "comment" ? "Liked a comment." : "Liked a post.", error: false });
      else if (res.status === "nothing_to_like") setLikeMessage({ text: "Nothing left to like right now.", error: false });
      else setLikeMessage({ text: res.error ?? "The like didn't go through.", error: true });
    } catch (err) {
      setLikeMessage({ text: errorMessage(err), error: true });
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
            disabled={update.isPending || (!account.is_enabled && !ready)}
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
        <p className="text-xs text-ink-muted mb-2">
          {account.is_enabled
            ? `Active. Next post ${formatInZone(account.next_run_at, account.timezone)}.`
            : "Paused. Nothing will be published until you turn it on."}
        </p>
        {!account.is_enabled && missing.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-3 mb-1">
            <p className="text-xs font-medium text-ink mb-1">Before you can turn it on</p>
            <ul className="text-xs text-ink-muted space-y-0.5 list-disc pl-4">
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        {toggleError && <p className="text-xs text-danger mb-1">{toggleError}</p>}

        <div className="mt-6 space-y-8">
          {/* Template */}
          <section>
            <h3 className="text-sm font-medium text-ink mb-1">Template</h3>
            <select
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              disabled={update.isPending || !catalog}
              aria-label="Template"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-ink disabled:opacity-50"
            >
              {templateOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            {template?.description && <p className="text-xs text-ink-muted mt-2">{template.description}</p>}
            {pipelineError && <p className="text-xs text-danger mt-1">{pipelineError}</p>}
          </section>

          {/* Writing */}
          <section>
            <h3 className="text-sm font-medium text-ink mb-1">Writing</h3>
            <p className="text-xs text-ink-muted mb-2">
              The niche, voice, audience, viewpoint, boundaries and what each post should achieve. Natural writing rules
              (no emoji, no dashes, no AI sounding phrasing) are applied to every account automatically.
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={9}
              maxLength={6000}
              placeholder="Describe the account: who it writes for, its voice, what it covers and what it leaves out…"
              className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink text-sm leading-relaxed"
            />
            <p className="text-xs text-ink-muted text-right">{prompt.length}/6000</p>
            <div className="grid grid-cols-2 gap-3 mt-3">
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

          {/* Template settings */}
          {templateSettings.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-ink mb-1">{template?.label} settings</h3>
              <div className="grid grid-cols-2 gap-3">
                {templateSettings.map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-xs text-ink-muted">{f.label}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={f.min}
                      max={f.max}
                      value={settingEdits[f.key] ?? settingNow(f, {}, account.news_settings ?? {})}
                      onChange={(e) => setSettingEdits((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))}
                      className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-ink"
                    />
                    {f.help && <span className="block text-[11px] text-ink-muted mt-1">{f.help}</span>}
                  </label>
                ))}
              </div>
            </section>
          )}


          {/* AI provider */}
          <section>
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
                className="flex-1 bg-cta text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-40"
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
                        slot.days.length === 0 ? "bg-cta text-white border-cta" : "border-border text-ink-muted"
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
                            on ? "bg-cta text-white border-cta" : "border-border text-ink-muted"
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

          {/* Daily like */}
          <section>
            <h3 className="text-sm font-medium text-ink mb-2">Daily like</h3>
            <p className="text-xs text-ink-muted mb-3">
              Once a day this account likes one post by someone else. When there are no posts left to like, it likes
              questions and adds on comments instead. It never likes pushbacks, its own posts, or the same thing twice.
            </p>
            <div className="bg-surface rounded-xl p-3 border border-border space-y-3">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink">Like something every day</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={likeEnabled}
                  onChange={(e) => setLikeEnabled(e.target.checked)}
                  className="h-5 w-5 accent-[var(--color-cta)]"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink">
                  Time <span className="text-xs text-ink-muted">({timezone})</span>
                </span>
                <input
                  type="time"
                  value={likeTime}
                  disabled={!likeEnabled}
                  onChange={(e) => setLikeTime(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-canvas text-ink disabled:opacity-40"
                />
              </label>
              <p className="text-xs text-ink-muted">
                {account.daily_like_enabled && account.next_like_at
                  ? `Next like ${formatInZone(account.next_like_at, account.timezone)}.`
                  : "Not scheduled. Save to apply."}
                {account.last_like_at ? ` Last like ${formatInZone(account.last_like_at, account.timezone)}.` : ""}
              </p>
              {likeMessage && (
                <p className={`text-xs ${likeMessage.error ? "text-danger" : "text-ink-muted"}`}>{likeMessage.text}</p>
              )}
              <button
                type="button"
                onClick={handleLikeNow}
                disabled={likeNow.isPending || dirty}
                className="w-full border border-border rounded-xl py-2.5 text-sm font-medium text-ink disabled:opacity-40"
              >
                {likeNow.isPending ? "Liking…" : dirty ? "Save changes to like now" : "Like one thing now"}
              </button>
              {likeLog.length > 0 && (
                <ul className="text-xs text-ink-muted space-y-0.5">
                  {likeLog.slice(0, 5).map((l) => (
                    <li key={l.id}>
                      {formatInZone(l.created_at, account.timezone)} ·{" "}
                      {l.status === "liked"
                        ? `liked a ${l.target_type}`
                        : l.status === "nothing_to_like"
                          ? "nothing left to like"
                          : l.status === "skipped"
                            ? "skipped (missed its time)"
                            : `failed${l.error ? `: ${l.error}` : ""}`}
                      {l.trigger === "manual" ? " (manual)" : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {template?.uses_sources && <AutomationSourcesPanel accountId={account.id} timezone={account.timezone} />}

          {template?.uses_idea_vault && (
          <section>
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
                    ideaHigh ? "bg-cta text-white border-cta" : "border-border text-ink-muted"
                  }`}
                >
                  <Star size={13} /> High priority
                </button>
                <button
                  type="submit"
                  disabled={addIdea.isPending || !ideaText.trim()}
                  className="ml-auto bg-cta text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40"
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
                    ideaTab === tab ? "bg-cta text-white border-cta" : "border-border text-ink-muted"
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

          {/* Try it */}
          <section>
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
                    className="flex-1 bg-cta text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
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

          {/* History */}
          <section>
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
                            ? "bg-cta text-white"
                            : run.status === "failed"
                              ? "bg-danger text-white"
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
        </div>

        <div className="mt-10">
        <button
          type="button"
          onClick={handleRemove}
          className="w-full border border-border text-danger rounded-xl py-2.5 text-sm font-medium"
        >
          Stop automating this account
        </button>
        </div>

        {/* Save bar */}
        {(dirty || saveError) && (
          <div className="sticky bottom-0 -mx-4 mt-6 px-4 py-3 bg-canvas border-t border-border">
            {saveError && <p className="text-xs text-danger mb-2">{saveError}</p>}
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={!dirty || update.isPending}
              className="w-full bg-cta text-white rounded-xl py-3 font-medium disabled:opacity-40"
            >
              {update.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
