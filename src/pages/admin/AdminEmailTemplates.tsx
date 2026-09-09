// src/pages/admin/AdminEmailTemplates.tsx
import { Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { useEmailTemplates } from "../../hooks/useAdminComms";

export function AdminEmailTemplates() {
  const smartBack = useSmartBack();
  const { data: templates, isLoading } = useEmailTemplates();

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink flex-1">Email templates</h2>
          <Link
            to="/admin/emails/templates/new"
            className="bg-accent text-canvas w-9 h-9 rounded-xl flex items-center justify-center"
          >
            <Plus size={18} />
          </Link>
        </div>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !templates || templates.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">No templates yet.</p>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <Link
                key={t.id}
                to={`/admin/emails/templates/${t.id}`}
                className="block bg-surface rounded-xl p-4 border border-border"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-ink">{t.name}</span>
                  {t.is_draft && (
                    <span className="text-xs bg-highlight text-ink-muted px-2 py-0.5 rounded-full">Draft</span>
                  )}
                </div>
                <p className="text-sm text-ink-muted truncate">{t.subject}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
