import { useSmartBack } from "../../hooks/useSmartBack";
import { ArrowLeft } from "lucide-react";
import { ToggleSwitch } from "../../components/admin/ToggleSwitch";
import { usePagesFeatureSettings, useTogglePagesEnabled } from "../../hooks/useAdmin";

// /admin/page-settings — site-wide on/off switch for standing up new
// organisation, brand, or product pages. Turning this off hides the
// "Page" row in the profile owner menu, the "+ create a page" row in
// the account-mode switcher, and blocks /pages/new directly. Pages
// that already exist, and switching into/acting as one, are
// unaffected either way.
export function AdminPageSettings() {
  const smartBack = useSmartBack();
  const { data: settings, isLoading } = usePagesFeatureSettings();
  const toggle = useTogglePagesEnabled();

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Page settings</h2>
        </div>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ink">Allow new pages</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  When on, anyone can stand up a new organisation, brand, or product page.
                  Turning this off hides the "create a page" entry points and blocks the
                  /pages/new form directly — pages that already exist, and switching into
                  them, keep working as normal either way.
                </p>
              </div>
              <ToggleSwitch
                checked={settings?.pages_creation_enabled ?? true}
                disabled={toggle.isPending}
                onChange={(checked) => toggle.mutate(checked)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
