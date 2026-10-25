// src/pages/admin/AutomationSourcesPanel.tsx
// News sources for one automated account (pipeline "news"): add a feed, paste its key, edit its request list, switch it
// on or off, and "Fetch now" to see what each feed returns without publishing anything. Keys are write only: they go
// to Supabase Vault and can only be replaced or removed here. See supabase/ako_post_automation_news.sql.
import { useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  SOURCE_PROVIDERS,
  useAddAutomationSource,
  useAutomationSources,
  useClearSourceKey,
  useDeleteAutomationSource,
  useFetchAutomationSources,
  useSaveSourceKey,
  useUpdateAutomationSource,
  type AutomationSource,
  type SourceProvider,
  type SourceReport,
} from "../../hooks/useAutomation";
import { BLANK_CONFIG, SOURCE_PRESETS } from "../../lib/automationSources";
import { friendlyError } from "../../lib/friendlyError";
import { formatInZone } from "./AdminAutomation";

function errorMessage(err: unknown): string {
  return friendlyError(err, "Something went wrong. Please try again.");
}

function parseConfig(text: string): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "The config must be a JSON object." };
    const requests = (value as { requests?: unknown }).requests;
    if (!Array.isArray(requests) || requests.length === 0) {
      return { ok: false, error: "Add a \"requests\" list with at least one request." };
    }
    if (requests.length > 6) return { ok: false, error: "A source reads at most 6 requests." };
    return { ok: true, value };
  } catch {
    return { ok: false, error: "That isn't valid JSON." };
  }
}

export function AutomationSourcesPanel({ accountId, timezone }: { accountId: string; timezone: string }) {
  const { data: sources = [] } = useAutomationSources(accountId);
  const add = useAddAutomationSource();
  const fetchNow = useFetchAutomationSources();

  const [adding, setAdding] = useState(false);
  const [provider, setProvider] = useState<SourceProvider>("newsdata");
  const [label, setLabel] = useState("");
  const [configText, setConfigText] = useState(JSON.stringify(BLANK_CONFIG.newsdata, null, 2));
  const [apiKey, setApiKey] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [reports, setReports] = useState<SourceReport[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const needsKey = SOURCE_PROVIDERS.find((p) => p.value === provider)?.needsKey ?? false;

  function startFrom(nextProvider: SourceProvider, nextLabel: string, config: Record<string, unknown>) {
    setProvider(nextProvider);
    setLabel(nextLabel);
    setConfigText(JSON.stringify(config, null, 2));
    setAdding(true);
    setAddError(null);
  }

  async function handleAdd() {
    setAddError(null);
    const parsed = parseConfig(configText);
    if (!parsed.ok) return setAddError(parsed.error);
    if (!label.trim()) return setAddError("Give this source a name.");
    if (needsKey && !apiKey.trim()) return setAddError("Paste this provider's API key.");
    try {
      await add.mutateAsync({ accountId, provider, label: label.trim(), config: parsed.value, apiKey });
      setAdding(false);
      setLabel("");
      setApiKey("");
    } catch (err) {
      setAddError(errorMessage(err));
    }
  }

  async function handleFetch() {
    setFetchError(null);
    setReports(null);
    try {
      setReports(await fetchNow.mutateAsync(accountId));
    } catch (err) {
      setFetchError(errorMessage(err));
    }
  }

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-ink">News sources</h3>
        <button
          type="button"
          onClick={handleFetch}
          disabled={fetchNow.isPending || sources.length === 0}
          className="flex items-center gap-1 text-xs text-accent disabled:opacity-40"
        >
          <RefreshCw size={13} className={fetchNow.isPending ? "animate-spin" : ""} />
          {fetchNow.isPending ? "Fetching…" : "Fetch now"}
        </button>
      </div>
      <p className="text-xs text-ink-muted mb-3">
        The feeds this account writes from. Each run collects fresh articles, groups them into stories and writes about the
        best uncovered one. Fetching here only fills the article cache; nothing is published.
      </p>

      {fetchError && <p className="text-xs text-danger mb-2">{fetchError}</p>}
      {reports && (
        <ul className="text-xs mb-3 space-y-1">
          {reports.length === 0 && <li className="text-ink-muted">No sources are switched on.</li>}
          {reports.map((r) => (
            <li key={r.source_id} className={r.ok ? "text-ink-muted" : "text-danger"}>
              {r.label}: {r.ok ? `${r.fetched} articles` : r.error}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3">
        {sources.map((source) => (
          <SourceCard key={source.id} source={source} timezone={timezone} />
        ))}
        {sources.length === 0 && !adding && (
          <p className="text-xs text-ink-muted">No sources yet. Start from a preset or add one.</p>
        )}
      </div>

      {!adding && (
        <div className="mt-3 space-y-2">
          {SOURCE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => startFrom(preset.provider, preset.label, preset.config)}
              className="w-full text-left border border-border rounded-xl px-3 py-2.5 bg-surface"
            >
              <span className="block text-sm text-ink">{preset.label}</span>
              <span className="block text-xs text-ink-muted">{preset.note}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => startFrom(provider, "", BLANK_CONFIG[provider])}
            className="flex items-center gap-1 text-sm text-accent"
          >
            <Plus size={15} /> Add a source
          </button>
        </div>
      )}

      {adding && (
        <div className="mt-3 border border-border rounded-xl p-3 bg-surface space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-ink-muted">Provider</span>
              <select
                value={provider}
                onChange={(e) => {
                  const next = e.target.value as SourceProvider;
                  setProvider(next);
                  setConfigText(JSON.stringify(BLANK_CONFIG[next], null, 2));
                }}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-ink"
              >
                {SOURCE_PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-ink-muted">Name</span>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={60}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-ink"
              />
            </label>
          </div>
          {needsKey && (
            <label className="block">
              <span className="text-xs text-ink-muted">API key (stored encrypted, can't be read back)</span>
              <input
                type="password"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-ink"
              />
            </label>
          )}
          <label className="block">
            <span className="text-xs text-ink-muted">Requests (JSON)</span>
            <textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              rows={9}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-ink text-xs font-mono"
            />
          </label>
          {addError && <p className="text-xs text-danger">{addError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={add.isPending}
              className="flex-1 bg-accent text-canvas rounded-xl py-2.5 text-sm font-medium disabled:opacity-40"
            >
              {add.isPending ? "Adding…" : "Add source"}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="border border-border rounded-xl px-4 py-2.5 text-sm text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function SourceCard({ source, timezone }: { source: AutomationSource; timezone: string }) {
  const update = useUpdateAutomationSource();
  const saveKey = useSaveSourceKey();
  const clearKey = useClearSourceKey();
  const remove = useDeleteAutomationSource();

  const needsKey = SOURCE_PROVIDERS.find((p) => p.value === source.provider)?.needsKey ?? false;
  const [open, setOpen] = useState(false);
  const [configText, setConfigText] = useState(JSON.stringify(source.config, null, 2));
  const [newKey, setNewKey] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const providerLabel = SOURCE_PROVIDERS.find((p) => p.value === source.provider)?.label ?? source.provider;
  const configDirty = configText !== JSON.stringify(source.config, null, 2);

  async function run(action: () => Promise<unknown>, done: string) {
    setMessage(null);
    try {
      await action();
      setMessage({ text: done, error: false });
    } catch (err) {
      setMessage({ text: errorMessage(err), error: true });
    }
  }

  async function handleSaveConfig() {
    const parsed = parseConfig(configText);
    if (!parsed.ok) return setMessage({ text: parsed.error, error: true });
    await run(() => update.mutateAsync({ id: source.id, patch: { config: parsed.value } }), "Saved.");
  }

  async function handleToggle() {
    if (!source.is_enabled && needsKey && !source.api_key_last4) {
      return setMessage({ text: "Save an API key first.", error: true });
    }
    await run(() => update.mutateAsync({ id: source.id, patch: { is_enabled: !source.is_enabled } }), "Saved.");
  }

  return (
    <div className="border border-border rounded-xl p-3 bg-surface">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-left min-w-0">
          <span className="block text-sm text-ink truncate">{source.label}</span>
          <span className="block text-xs text-ink-muted">
            {providerLabel}
            {needsKey && ` · key ${source.api_key_last4 ? `ending ${source.api_key_last4}` : "missing"}`}
          </span>
          <span className={`block text-xs ${source.last_status === "error" ? "text-danger" : "text-ink-muted"}`}>
            {source.last_fetched_at
              ? source.last_status === "error"
                ? `Last fetch failed: ${source.last_error ?? "unknown error"}`
                : `${source.last_count ?? 0} articles, ${formatInZone(source.last_fetched_at, timezone)}`
              : "Not fetched yet"}
          </span>
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={source.is_enabled}
          aria-label={source.is_enabled ? "Switch source off" : "Switch source on"}
          onClick={handleToggle}
          className={`shrink-0 w-11 h-6 rounded-full relative transition-colors ${source.is_enabled ? "bg-accent" : "bg-border"}`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-canvas transition-all ${source.is_enabled ? "left-5" : "left-0.5"}`}
          />
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          {needsKey && (
            <div>
              <span className="text-xs text-ink-muted">
                {source.api_key_last4 ? "Paste a new key to replace it" : "API key"}
              </span>
              <div className="flex gap-2 mt-1">
                <input
                  type="password"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-border bg-canvas text-ink"
                />
                <button
                  type="button"
                  disabled={!newKey.trim() || saveKey.isPending}
                  onClick={() =>
                    run(async () => {
                      await saveKey.mutateAsync({ id: source.id, apiKey: newKey });
                      setNewKey("");
                    }, "Key saved.")
                  }
                  className="bg-accent text-canvas rounded-xl px-3 text-sm disabled:opacity-40"
                >
                  Save
                </button>
              </div>
              {source.api_key_last4 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Remove this key? The source switches off.")) {
                      void run(() => clearKey.mutateAsync(source.id), "Key removed.");
                    }
                  }}
                  className="text-xs text-danger mt-1"
                >
                  Remove key
                </button>
              )}
            </div>
          )}

          <label className="block">
            <span className="text-xs text-ink-muted">Requests (JSON)</span>
            <textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              rows={9}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-ink text-xs font-mono"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={!configDirty || update.isPending}
              className="flex-1 bg-accent text-canvas rounded-xl py-2 text-sm font-medium disabled:opacity-40"
            >
              Save requests
            </button>
            <button
              type="button"
              aria-label="Delete source"
              onClick={() => {
                if (window.confirm(`Delete ${source.label}? Articles already collected stay.`)) {
                  void run(() => remove.mutateAsync(source.id), "Deleted.");
                }
              }}
              className="border border-border text-danger rounded-xl px-3"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      {message && <p className={`text-xs mt-2 ${message.error ? "text-danger" : "text-ink-muted"}`}>{message.text}</p>}
    </div>
  );
}
