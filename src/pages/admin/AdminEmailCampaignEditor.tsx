// src/pages/admin/AdminEmailCampaignEditor.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import {
  useEmailTemplates,
  useEmailCampaign,
  useSaveCampaign,
  useSendCampaignNow,
  type AudienceInput,
  type ScheduleType,
  type Recurrence,
} from "../../hooks/useAdminComms";
import { AudiencePicker } from "../../components/admin/AudiencePicker";
import { FormField } from "../../components/FormField";
import { Button } from "../../components/Button";

const SCHEDULE_OPTIONS: { value: ScheduleType; label: string }[] = [
  { value: "immediate", label: "Send now" },
  { value: "scheduled", label: "Schedule for later" },
  { value: "recurring", label: "Recurring" },
];

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminEmailCampaignEditor() {
  const smartBack = useSmartBack();
  const navigate = useNavigate();
  const { campaignId } = useParams<{ campaignId: string }>();
  const isNew = !campaignId || campaignId === "new";

  const { data: templates } = useEmailTemplates();
  const { data: existing, isLoading } = useEmailCampaign(isNew ? undefined : campaignId);
  const save = useSaveCampaign();
  const sendNow = useSendCampaignNow();

  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [audience, setAudience] = useState<AudienceInput>({
    audience_type: "all",
    audience_filter: {},
    manual_recipient_ids: [],
  });
  const [scheduleType, setScheduleType] = useState<ScheduleType>("immediate");
  const [sendAt, setSendAt] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("weekly");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setTemplateId(existing.template_id);
    setAudience({
      audience_type: existing.audience_type,
      audience_filter: existing.audience_filter,
      manual_recipient_ids: existing.manual_recipient_ids,
    });
    setScheduleType(existing.schedule_type);
    setSendAt(toLocalInputValue(existing.send_at));
    if (existing.recurrence) setRecurrence(existing.recurrence);
  }, [existing]);

  function buildInput(status: "draft" | "scheduled") {
    return {
      template_id: templateId,
      name,
      audience_type: audience.audience_type,
      audience_filter: audience.audience_filter,
      manual_recipient_ids: audience.manual_recipient_ids,
      schedule_type: scheduleType,
      send_at: scheduleType === "immediate" ? null : sendAt ? new Date(sendAt).toISOString() : null,
      recurrence: scheduleType === "recurring" ? recurrence : null,
      status,
    };
  }

  function validate(): string | null {
    if (!name.trim()) return "Give the campaign a name.";
    if (!templateId) return "Pick a template.";
    if (scheduleType !== "immediate" && !sendAt) return "Pick a send date and time.";
    if (audience.audience_type === "tier" && !audience.audience_filter.tier) return "Pick an account type.";
    if (audience.audience_type === "page_followers" && !audience.audience_filter.page_id)
      return "Pick an organisation.";
    if (audience.audience_type === "manual" && audience.manual_recipient_ids.length === 0)
      return "Search and select at least one user.";
    return null;
  }

  async function handleSaveDraft() {
    setError(null);
    const problem = !name.trim() ? "Give the campaign a name." : !templateId ? "Pick a template." : null;
    if (problem) return setError(problem);
    const id = await save.mutateAsync({ id: isNew ? undefined : campaignId, input: buildInput("draft") });
    navigate(`/admin/emails/campaigns/${id}`, { replace: true });
  }

  async function handleScheduleOrSend() {
    setError(null);
    setSuccessMsg(null);
    const problem = validate();
    if (problem) return setError(problem);

    try {
      if (scheduleType === "immediate") {
        const id = await save.mutateAsync({
          id: isNew ? undefined : campaignId,
          input: buildInput("scheduled"),
        });
        const result = await sendNow.mutateAsync(id);
        setSuccessMsg(`Sent — ${result.sent_count} delivered, ${result.failed_count} failed.`);
        navigate(`/admin/emails/campaigns/${id}`, { replace: true });
      } else {
        const id = await save.mutateAsync({
          id: isNew ? undefined : campaignId,
          input: buildInput("scheduled"),
        });
        navigate(`/admin/emails/campaigns/${id}`, { replace: true });
      }
    } catch (err: any) {
      setError(err.message ?? "Couldn't send campaign.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">{isNew ? "New campaign" : "Edit campaign"}</h2>
        </div>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <div>
            <FormField id="name" label="Campaign name" value={name} onChange={(e) => setName(e.target.value)} required />

            <div className="mb-4">
              <label htmlFor="template" className="block text-sm font-medium text-ink-muted mb-1.5">
                Template
              </label>
              <select
                id="template"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink"
              >
                <option value="">Select a template…</option>
                {templates?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.is_draft ? " (draft)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <AudiencePicker value={audience} onChange={setAudience} />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-ink-muted mb-1.5">Schedule</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {SCHEDULE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScheduleType(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      scheduleType === opt.value
                        ? "bg-accent text-canvas border-accent"
                        : "bg-surface text-ink-muted border-border"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {scheduleType !== "immediate" && (
                <input
                  type="datetime-local"
                  value={sendAt}
                  onChange={(e) => setSendAt(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink mb-3"
                />
              )}

              {scheduleType === "recurring" && (
                <div className="flex gap-2">
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRecurrence(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        recurrence === opt.value
                          ? "bg-accent-soft text-accent border-accent"
                          : "bg-surface text-ink-muted border-border"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className="text-danger text-sm mb-4" role="alert">
                {error}
              </p>
            )}
            {successMsg && <p className="text-sm text-accent mb-4">{successMsg}</p>}

            <div className="flex gap-2">
              <Button variant="secondary" loading={save.isPending} onClick={handleSaveDraft}>
                Save as draft
              </Button>
              <Button loading={save.isPending || sendNow.isPending} onClick={handleScheduleOrSend}>
                {scheduleType === "immediate" ? "Send now" : "Schedule"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
