// src/pages/admin/AdminAutomation.tsx
// Automate posts: the accounts that publish on their own. Pick an existing Akọ account to automate, then open it to
// write its brief, set the schedule and fill its idea vault. See supabase/ako_post_automation.sql.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { Avatar } from "../../components/Avatar";
import { useAdminSearchUsers } from "../../hooks/useAdminComms";
import { useAutomatedAccounts, useAutomationCatalog, useCreateAutomatedAccount } from "../../hooks/useAutomation";
import { useToast } from "../../components/Toast";
import { useErrorNotice } from "../../components/ErrorNotice";
import { AutomationRulesPanel } from "./AutomationRulesPanel";

export function formatInZone(iso: string | null, timeZone: string): string {
  if (!iso) return "Not scheduled";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function AdminAutomation() {
  const notifyError = useErrorNotice();
  const toast = useToast();
  const smartBack = useSmartBack();
  const navigate = useNavigate();
  const { data: accounts = [], isLoading } = useAutomatedAccounts();
  const createAccount = useCreateAutomatedAccount();

  const [query, setQuery] = useState("");
  const { data: catalog } = useAutomationCatalog();
  const templates = catalog?.templates ?? [];
  const [templateId, setTemplateId] = useState("");
  const template = templates.find((t) => t.id === templateId) ?? templates[0];
  const { data: results = [], isFetching } = useAdminSearchUsers(query);

  const taken = new Set(accounts.map((a) => a.user_id));

  async function handlePick(userId: string) {
    if (!template) return;
    try {
      const id = await createAccount.mutateAsync({ userId, pipeline: template.id });
      navigate(`/admin/automation/${id}`);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e?.code === "23505") toast("That account is already automated.", { variant: "error" });
      else notifyError(err, "Something went wrong.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={smartBack} className="text-ink-muted" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Automate posts</h2>
        </div>
        <p className="text-sm text-ink-muted mb-6">
          Accounts here post on their own, on the schedule you set, in the voice you describe. Only admins can see this.
        </p>

        <Link
          to="/admin/automation/vault"
          className="flex items-center gap-3 bg-surface rounded-xl p-3 border border-border mb-6"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-ink">Idea vault</p>
            <p className="text-xs text-ink-muted">
              One place for every idea. The System Bot decides which account each one belongs to.
            </p>
          </div>
          <ChevronRight size={16} className="text-ink-muted" />
        </Link>

        <h3 className="text-sm font-medium text-ink mb-2">Automated accounts</h3>
        {isLoading ? (
          <p className="text-ink-muted text-center py-6">Loading…</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-ink-muted bg-surface rounded-xl p-3 border border-border mb-6">
            Nothing automated yet. Add an account below.
          </p>
        ) : (
          <div className="space-y-2 mb-6">
            {accounts.map((a) => (
              <Link
                key={a.id}
                to={`/admin/automation/${a.id}`}
                className="flex items-center gap-3 bg-surface rounded-xl p-3 border border-border"
              >
                <Avatar src={a.profile?.avatar_url} name={a.profile?.display_name ?? "?"} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{a.profile?.display_name ?? "Unknown account"}</p>
                  <p className="text-xs text-ink-muted truncate">
                    @{a.profile?.username ?? "unknown"} ·{" "}
                    {a.is_enabled ? `Next ${formatInZone(a.next_run_at, a.timezone)}` : "Paused"}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {templates.find((t) => t.id === a.pipeline)?.label ?? a.pipeline}
                    {templates.find((t) => t.id === a.pipeline)?.uses_idea_vault
                      ? ` · ${a.pending_ideas} idea${a.pending_ideas === 1 ? "" : "s"} waiting`
                      : ""}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${
                    a.is_enabled ? "bg-cta text-white" : "border border-border text-ink-muted"
                  }`}
                >
                  {a.is_enabled ? "Active" : "Paused"}
                </span>
                <ChevronRight size={16} className="text-ink-muted" />
              </Link>
            ))}
          </div>
        )}

        <AutomationRulesPanel />

        <h3 className="text-sm font-medium text-ink mb-2">Add an account</h3>
        <p className="text-xs text-ink-muted mb-3">
          Create the user account the normal way first, then find it here by name or username.
        </p>
        <label className="block mb-3">
          <span className="text-xs text-ink-muted">Template</span>
          <select
            value={template?.id ?? ""}
            onChange={(e) => setTemplateId(e.target.value)}
            disabled={templates.length === 0}
            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-ink"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          {template?.description && <span className="block text-xs text-ink-muted mt-1">{template.description}</span>}
        </label>
        <div className="relative mb-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or username"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-ink"
          />
        </div>
        {query.trim().length >= 2 && (
          <div className="space-y-2">
            {isFetching && results.length === 0 && <p className="text-xs text-ink-muted">Searching…</p>}
            {!isFetching && results.length === 0 && <p className="text-xs text-ink-muted">No one found.</p>}
            {results.map((u) => {
              const already = taken.has(u.id);
              return (
                <button
                  key={u.id}
                  disabled={already || createAccount.isPending || !template}
                  onClick={() => handlePick(u.id)}
                  className="w-full flex items-center gap-3 bg-surface rounded-xl p-3 border border-border text-left disabled:opacity-50"
                >
                  <Avatar src={u.avatar_url} name={u.display_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink truncate">{u.display_name}</p>
                    <p className="text-xs text-ink-muted truncate">@{u.username}</p>
                  </div>
                  <span className="text-xs text-ink-muted">{already ? "Already added" : "Automate"}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
