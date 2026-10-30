// src/pages/admin/AdminAutomationVault.tsx
// The global idea vault for Automate posts. Paste any thought; the System Bot places it with the one automated account
// it suits, that account writes it up on its next post, and the idea is then Done. A Done idea rests for the waiting
// period, then another account can take it, and an account only gets an idea back after other accounts have had their
// turn. Rules and tables: supabase/ako_automation_global_vault.sql. Placement: the assign-vault-ideas edge function.
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Archive, ArrowLeft, RotateCcw, Star, Trash2, Wand2 } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { AI_PROVIDERS, useAutomatedAccounts, type AiProvider } from "../../hooks/useAutomation";
import {
  useAddVaultIdea,
  useClearSystemBotKey,
  useDeleteVaultIdea,
  usePlaceVaultIdea,
  useRunVaultSweep,
  useSaveSystemBotAi,
  useSaveSystemBotSettings,
  useSystemBot,
  useUpdateVaultIdea,
  useVaultIdeas,
  useVaultTurns,
  type PlacementResult,
  type VaultIdea,
  type VaultStatus,
  type VaultTurn,
} from "../../hooks/useAutomationVault";
import { useToast } from "../../components/Toast";
import { friendlyError } from "../../lib/friendlyError";

type Tab = VaultStatus;

const TABS: { id: Tab; label: string }[] = [
  { id: "new", label: "Waiting" },
  { id: "active", label: "In rotation" },
  { id: "unfit", label: "No fit" },
  { id: "retired", label: "Retired" },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function addMonths(iso: string, months: number): Date {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d;
}

// The admin's own wording for what a placement attempt did.
function describePlacement(r: PlacementResult): { text: string; error: boolean } {
  switch (r.outcome) {
    case "assigned":
      return { text: `Placed with ${r.account ?? "an account"}.${r.note ? ` ${r.note}` : ""}`, error: false };
    case "unfit":
      return { text: `No account fits this idea. ${r.note ?? ""}`.trim(), error: false };
    case "no_fit":
      return { text: `No other account fits it right now. ${r.note ?? ""}`.trim(), error: false };
    case "waiting":
      return { text: r.note ?? "It will be placed when an account can take it.", error: false };
    case "skipped":
      return { text: r.note ?? "Nothing to do for this idea.", error: false };
    default:
      return { text: r.note ?? "The System Bot couldn't place this idea.", error: true };
  }
}

export function AdminAutomationVault() {
  const smartBack = useSmartBack();
  const toast = useToast();

  const { data: bot } = useSystemBot();
  const { data: ideas = [], isLoading } = useVaultIdeas();
  const { data: turns = [] } = useVaultTurns();
  const { data: accounts = [] } = useAutomatedAccounts();

  const addIdea = useAddVaultIdea();
  const placeIdea = usePlaceVaultIdea();
  const updateIdea = useUpdateVaultIdea();
  const deleteIdea = useDeleteVaultIdea();
  const runSweep = useRunVaultSweep();
  const saveAi = useSaveSystemBotAi();
  const clearKey = useClearSystemBotKey();
  const saveSettings = useSaveSystemBotSettings();

  // System Bot form
  const [provider, setProvider] = useState<AiProvider>("anthropic");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [cooldown, setCooldown] = useState("6");
  const [others, setOthers] = useState("3");
  const [cap, setCap] = useState("15");
  const [botMessage, setBotMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [formSeeded, setFormSeeded] = useState(false);

  useEffect(() => {
    if (!bot || formSeeded) return;
    setProvider(bot.ai_provider);
    setModel(bot.ai_model ?? "");
    setCooldown(String(bot.cooldown_months));
    setOthers(String(bot.min_other_accounts));
    setCap(String(bot.queue_cap));
    setFormSeeded(true);
  }, [bot, formSeeded]);

  // New idea form
  const [ideaText, setIdeaText] = useState("");
  const [ideaHigh, setIdeaHigh] = useState(false);
  const [addMessage, setAddMessage] = useState<{ text: string; error: boolean } | null>(null);

  const [tab, setTab] = useState<Tab | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowMessage, setRowMessage] = useState<{ id: string; text: string; error: boolean } | null>(null);

  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accounts) map.set(a.id, a.profile?.display_name?.trim() || a.profile?.username || "Unknown account");
    return (id: string) => map.get(id) ?? "Removed account";
  }, [accounts]);

  const turnsByIdea = useMemo(() => {
    const map = new Map<string, VaultTurn[]>();
    for (const t of turns) map.set(t.vault_id, [...(map.get(t.vault_id) ?? []), t]);
    return map;
  }, [turns]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { new: 0, active: 0, unfit: 0, retired: 0 };
    for (const i of ideas) c[i.status]++;
    return c;
  }, [ideas]);

  const activeTab: Tab = tab ?? (counts.new > 0 ? "new" : "active");
  const shown = ideas.filter((i) => i.status === activeTab);

  const botReady = !!bot?.api_key_last4;
  const botOn = !!bot?.is_enabled;
  const months = bot?.cooldown_months ?? 6;

  async function handleSaveAi() {
    setBotMessage(null);
    try {
      const res = await saveAi.mutateAsync({ provider, model, apiKey });
      setApiKey("");
      setBotMessage({
        text: res.key_saved
          ? "Saved."
          : res.key_removed
            ? `Provider changed. The old key was removed${res.paused ? " and the System Bot was turned off" : ""}. Paste a key for ${
                AI_PROVIDERS.find((p) => p.value === provider)?.label ?? "the new provider"
              }.`
            : "Saved.",
        error: false,
      });
    } catch (err) {
      setBotMessage({ text: friendlyError(err, "Couldn't save the System Bot's AI settings."), error: true });
    }
  }

  async function handleRemoveKey() {
    if (!window.confirm("Remove the System Bot's key? It will be turned off until you add one.")) return;
    setBotMessage(null);
    try {
      await clearKey.mutateAsync();
      setBotMessage({ text: "Key removed. The System Bot is off.", error: false });
    } catch (err) {
      setBotMessage({ text: friendlyError(err, "Couldn't remove the key."), error: true });
    }
  }

  async function handleSaveSettings(enabled: boolean) {
    setBotMessage(null);
    try {
      await saveSettings.mutateAsync({
        enabled,
        cooldownMonths: Number(cooldown),
        minOthers: Number(others),
        queueCap: Number(cap),
      });
      setBotMessage({ text: enabled ? "Saved. The System Bot is on." : "Saved. The System Bot is off.", error: false });
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "";
      // The database's own messages for these rules are written to be read, so show them.
      setBotMessage({ text: message.length > 0 && message.length < 140 ? message : friendlyError(err, "Couldn't save."), error: true });
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const cleaned = ideaText.trim();
    if (!cleaned) return;
    setAddMessage(null);
    try {
      const res = await addIdea.mutateAsync({ idea: cleaned, priority: ideaHigh ? "high" : "normal", placeNow: botOn });
      setIdeaText("");
      setIdeaHigh(false);
      if (res.placement) {
        setAddMessage(describePlacement(res.placement));
      } else if (res.placementError) {
        setAddMessage({ text: `Saved. It couldn't be placed yet (${res.placementError}). The hourly sweep will try again.`, error: false });
      } else {
        setAddMessage({
          text: botOn ? "Saved." : "Saved. Turn the System Bot on and it will be placed with the account it suits.",
          error: false,
        });
      }
      setTab(null);
    } catch (err) {
      setAddMessage({ text: friendlyError(err, "Couldn't save that idea."), error: true });
    }
  }

  async function handlePlace(id: string) {
    setBusyId(id);
    setRowMessage(null);
    try {
      const result = await placeIdea.mutateAsync(id);
      setRowMessage({ id, ...describePlacement(result) });
    } catch (err) {
      setRowMessage({ id, text: err instanceof Error ? err.message.slice(0, 300) : "Couldn't place it.", error: true });
    } finally {
      setBusyId(null);
    }
  }

  async function handleSweep() {
    try {
      const results = await runSweep.mutateAsync();
      const placed = results.filter((r) => r.outcome === "assigned").length;
      toast(
        results.length === 0
          ? "Nothing needs placing right now."
          : `Looked at ${results.length} idea${results.length === 1 ? "" : "s"}, placed ${placed}.`,
      );
    } catch (err) {
      toast(err instanceof Error ? err.message.slice(0, 200) : "The sweep failed.", { variant: "error" });
    }
  }

  function handleRetire(idea: VaultIdea) {
    updateIdea.mutate({ id: idea.id, patch: { status: "retired" } });
  }

  function handleRestore(idea: VaultIdea) {
    const hasTurns = (turnsByIdea.get(idea.id) ?? []).length > 0;
    updateIdea.mutate({ id: idea.id, patch: { status: hasTurns ? "active" : "new" } });
  }

  const settingsDirty =
    !!bot &&
    (Number(cooldown) !== bot.cooldown_months || Number(others) !== bot.min_other_accounts || Number(cap) !== bot.queue_cap);

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={smartBack} className="text-ink-muted" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Idea vault</h2>
        </div>
        <p className="text-sm text-ink-muted mb-6">
          Paste any thought, question or news. The System Bot places it with the account it suits and that account writes
          it up on its next post. You never have to pick an account.
        </p>

        {/* Add an idea */}
        <section className="mb-6">
          <h3 className="text-sm font-medium text-ink mb-2">Add an idea</h3>
          <form onSubmit={handleAdd} className="space-y-2">
            <textarea
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="A random thought, observation, question or half formed idea…"
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
              <span className="text-xs text-ink-muted ml-auto">{ideaText.length}/1000</span>
              <button
                type="submit"
                disabled={addIdea.isPending || !ideaText.trim()}
                className="bg-cta text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40"
              >
                {addIdea.isPending ? (botOn ? "Placing…" : "Saving…") : "Add idea"}
              </button>
            </div>
            {addMessage && <p className={`text-xs ${addMessage.error ? "text-danger" : "text-ink-muted"}`}>{addMessage.text}</p>}
          </form>
        </section>

        {/* The vault */}
        <section className="mb-8">
          <div className="flex items-center mb-2">
            <h3 className="text-sm font-medium text-ink">The vault ({ideas.length})</h3>
            {botOn && (
              <button
                type="button"
                onClick={handleSweep}
                disabled={runSweep.isPending}
                className="ml-auto text-xs text-accent disabled:opacity-40"
              >
                {runSweep.isPending ? "Running…" : "Run the System Bot now"}
              </button>
            )}
          </div>

          <div className="flex gap-2 mb-3 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`text-xs rounded-full px-3 py-1.5 border ${
                  activeTab === t.id ? "bg-cta text-white border-cta" : "border-border text-ink-muted"
                }`}
              >
                {t.label} ({counts[t.id]})
              </button>
            ))}
          </div>

          {isLoading ? (
            <p className="text-ink-muted text-center py-6">Loading…</p>
          ) : shown.length === 0 ? (
            <p className="text-sm text-ink-muted bg-surface rounded-xl p-3 border border-border">Nothing here.</p>
          ) : (
            <div className="space-y-2">
              {shown.map((idea) => {
                const history = turnsByIdea.get(idea.id) ?? [];
                const open = history.find((t) => t.status === "pending");
                const lastDone = [...history].reverse().find((t) => t.status === "used" && t.used_at);
                const freeFrom = lastDone?.used_at ? addMonths(lastDone.used_at, months) : null;
                const resting = !!freeFrom && freeFrom.getTime() > Date.now();
                const canPlace = (idea.status === "new" || idea.status === "unfit" || idea.status === "active") && !open && !resting;
                const msg = rowMessage?.id === idea.id ? rowMessage : null;

                return (
                  <div key={idea.id} className="bg-surface rounded-xl p-3 border border-border">
                    <p className="text-sm text-ink whitespace-pre-wrap">{idea.idea}</p>
                    <p className="text-xs text-ink-muted mt-1">
                      Added {fmtDate(idea.created_at)}
                      {idea.priority === "high" ? " · High priority" : ""}
                    </p>

                    {idea.fit_note && idea.status !== "retired" && (
                      <p className="text-xs text-ink-muted mt-2 italic">System Bot: {idea.fit_note}</p>
                    )}

                    {history.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {history.map((t) => (
                          <li key={t.id} className="text-xs text-ink-muted flex items-center gap-1 flex-wrap">
                            <span className="text-ink">{nameOf(t.account_id)}</span>
                            <span>
                              {t.status === "used" && t.used_at
                                ? `· Done ${fmtDate(t.used_at)}`
                                : t.status === "pending"
                                  ? "· Queued, waiting for its next post"
                                  : "· Removed from the queue"}
                            </span>
                            {t.status === "used" && t.used_post_id && (
                              <Link to={`/post/${t.used_post_id}`} className="text-accent">
                                View post
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {resting && freeFrom && idea.status !== "retired" && (
                      <p className="text-xs text-ink-muted mt-2">Resting. Another account can take it from {fmtDate(freeFrom.toISOString())}.</p>
                    )}
                    {idea.status === "new" && !botOn && (
                      <p className="text-xs text-ink-muted mt-2">Waiting for the System Bot to be turned on.</p>
                    )}

                    {msg && <p className={`text-xs mt-2 ${msg.error ? "text-danger" : "text-ink-muted"}`}>{msg.text}</p>}

                    <div className="flex items-center gap-1 mt-2">
                      {canPlace && (
                        <button
                          type="button"
                          onClick={() => handlePlace(idea.id)}
                          disabled={busyId === idea.id || !botOn}
                          className="text-xs rounded-lg border border-border px-2.5 py-1.5 text-ink flex items-center gap-1 disabled:opacity-40"
                        >
                          <Wand2 size={13} />
                          {busyId === idea.id ? "Placing…" : idea.status === "unfit" ? "Try again" : "Place now"}
                        </button>
                      )}
                      <div className="ml-auto flex items-center">
                        {idea.status !== "retired" && (
                          <button
                            type="button"
                            aria-label={idea.priority === "high" ? "Make normal priority" : "Make high priority"}
                            onClick={() =>
                              updateIdea.mutate({ id: idea.id, patch: { priority: idea.priority === "high" ? "normal" : "high" } })
                            }
                            className={`p-1.5 ${idea.priority === "high" ? "text-accent" : "text-ink-muted"}`}
                          >
                            <Star size={15} />
                          </button>
                        )}
                        {idea.status === "retired" ? (
                          <button
                            type="button"
                            aria-label="Put back in rotation"
                            onClick={() => handleRestore(idea)}
                            className="p-1.5 text-ink-muted"
                          >
                            <RotateCcw size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label="Retire idea"
                            onClick={() => handleRetire(idea)}
                            className="p-1.5 text-ink-muted"
                          >
                            <Archive size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label="Delete idea"
                          onClick={() => {
                            if (window.confirm("Delete this idea everywhere? Its history and any copy still waiting in a queue are removed. Posts already published stay.")) {
                              deleteIdea.mutate(idea.id);
                            }
                          }}
                          className="p-1.5 text-danger"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* System Bot */}
        <section className="mb-6">
          <div className="flex items-center mb-1">
            <h3 className="text-sm font-medium text-ink">System Bot</h3>
            <span
              className={`ml-auto text-[11px] font-medium rounded-full px-2 py-0.5 ${
                botOn ? "bg-cta text-white" : "border border-border text-ink-muted"
              }`}
            >
              {botOn ? "On" : "Off"}
            </span>
          </div>
          <p className="text-xs text-ink-muted mb-3">
            Reads each idea, compares it with every account that is allowed to take it right now, and places it with the one
            it suits best, or with none if nothing fits. It uses its own AI key, separate from the accounts. The key is
            stored encrypted and never shown again, only replaced or removed.
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
                API key{bot?.api_key_last4 ? ` (saved, ends in ${bot.api_key_last4})` : " (none saved)"}
              </span>
              <input
                type="password"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={bot?.api_key_last4 ? "Paste a new key to replace it" : "Paste the key"}
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
          {bot && provider !== bot.ai_provider && bot.api_key_last4 && !apiKey.trim() && (
            <p className="text-xs text-ink-muted mt-2">Switching provider without a new key removes the saved key and turns the System Bot off.</p>
          )}
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={handleSaveAi}
              disabled={saveAi.isPending || (!apiKey.trim() && provider === bot?.ai_provider && model.trim() === (bot?.ai_model ?? ""))}
              className="flex-1 bg-cta text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-40"
            >
              {saveAi.isPending ? "Saving…" : "Save AI settings"}
            </button>
            {bot?.api_key_last4 && (
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

          <h4 className="text-xs font-medium text-ink mt-5 mb-2">Rotation rules</h4>
          <div className="grid grid-cols-3 gap-2">
            <label className="block">
              <span className="text-[11px] text-ink-muted">Rest (months)</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={36}
                value={cooldown}
                onChange={(e) => setCooldown(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-surface text-ink"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-ink-muted">Others first</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={9}
                value={others}
                onChange={(e) => setOthers(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-surface text-ink"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-ink-muted">Queue limit</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={cap}
                onChange={(e) => setCap(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-surface text-ink"
              />
            </label>
          </div>
          <p className="text-xs text-ink-muted mt-2">
            A Done idea rests for {cooldown || "…"} months before anyone can reuse it. An account that already did an idea
            waits until {others || "…"} different accounts have done it since. An account with {cap || "…"} or more ideas
            waiting is given no more.
          </p>

          {botMessage && <p className={`text-xs mt-2 ${botMessage.error ? "text-danger" : "text-ink-muted"}`}>{botMessage.text}</p>}

          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => handleSaveSettings(botOn)}
              disabled={saveSettings.isPending || !settingsDirty}
              className="flex-1 border border-border text-ink rounded-xl py-2.5 text-sm font-medium disabled:opacity-40"
            >
              Save rules
            </button>
            <button
              type="button"
              onClick={() => handleSaveSettings(!botOn)}
              disabled={saveSettings.isPending || (!botOn && !botReady)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium disabled:opacity-40 ${
                botOn ? "border border-border text-danger" : "bg-cta text-white"
              }`}
            >
              {botOn ? "Turn off" : "Turn on"}
            </button>
          </div>
          {!botReady && <p className="text-xs text-ink-muted mt-2">Save an API key to turn the System Bot on.</p>}
        </section>
      </div>
    </div>
  );
}
