import { useSmartBack } from "../../hooks/useSmartBack";
import { ArrowLeft } from "lucide-react";
import { ToggleSwitch } from "../../components/admin/ToggleSwitch";
import { useModerationSettings, useToggleAiModeration } from "../../hooks/useAdmin";

export function AdminModeration() {
  const smartBack = useSmartBack();
  const { data: settings, isLoading } = useModerationSettings();
  const toggleModeration = useToggleAiModeration();

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Content moderation</h2>
        </div>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ink">AI content moderation</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  When on, posts, comments, and reshares are automatically screened before they're
                  published. Turning this off disables that screening app-wide.
                </p>
              </div>
              <ToggleSwitch
                checked={settings?.ai_moderation_enabled ?? true}
                disabled={toggleModeration.isPending}
                onChange={(checked) => toggleModeration.mutate(checked)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
