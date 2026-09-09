// src/pages/admin/AdminEmailTemplateEditor.tsx
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import {
  useEmailTemplate,
  useSaveEmailTemplate,
  useDeleteEmailTemplate,
} from "../../hooks/useAdminComms";
import { FormField } from "../../components/FormField";
import { Button } from "../../components/Button";

export function AdminEmailTemplateEditor() {
  const smartBack = useSmartBack();
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();
  const isNew = !templateId || templateId === "new";

  const { data: existing, isLoading } = useEmailTemplate(isNew ? undefined : templateId);
  const save = useSaveEmailTemplate();
  const remove = useDeleteEmailTemplate();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [isDraft, setIsDraft] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setSubject(existing.subject);
    setBodyHtml(existing.body_html);
    setBodyText(existing.body_text);
    setIsDraft(existing.is_draft);
  }, [existing]);

  async function handleSave(e: FormEvent, publishAsDraft: boolean) {
    e.preventDefault();
    setError(null);
    try {
      const id = await save.mutateAsync({
        id: isNew ? undefined : templateId,
        input: { name, subject, body_html: bodyHtml, body_text: bodyText, is_draft: publishAsDraft },
      });
      navigate(`/admin/emails/templates/${id}`, { replace: true });
    } catch (err: any) {
      setError(err.message ?? "Couldn't save template.");
    }
  }

  async function handleDelete() {
    if (!templateId || isNew) return;
    if (!confirm("Delete this template? Campaigns using it will need a new template.")) return;
    await remove.mutateAsync(templateId);
    navigate("/admin/emails/templates", { replace: true });
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink flex-1">{isNew ? "New template" : "Edit template"}</h2>
          {!isNew && (
            <button onClick={handleDelete} className="text-danger">
              <Trash2 size={18} />
            </button>
          )}
        </div>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <form onSubmit={(e) => handleSave(e, isDraft)}>
            <FormField id="name" label="Template name" value={name} onChange={(e) => setName(e.target.value)} required />
            <FormField
              id="subject"
              label="Subject line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />

            <div className="mb-4">
              <label htmlFor="body_html" className="block text-sm font-medium text-ink-muted mb-1.5">
                Body (HTML)
              </label>
              <textarea
                id="body_html"
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={8}
                placeholder="<p>Hi {{display_name}}, …</p>"
                className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink font-mono text-sm"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="body_text" className="block text-sm font-medium text-ink-muted mb-1.5">
                Body (plain text fallback)
              </label>
              <textarea
                id="body_text"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink text-sm"
              />
            </div>

            {error && (
              <p className="text-danger text-sm mb-4" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                loading={save.isPending && isDraft}
                onClick={(e) => handleSave(e as any, true)}
              >
                Save as draft
              </Button>
              <Button type="button" loading={save.isPending && !isDraft} onClick={(e) => handleSave(e as any, false)}>
                Save &amp; publish
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
