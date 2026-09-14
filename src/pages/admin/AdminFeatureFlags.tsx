// src/pages/admin/AdminFeatureFlags.tsx
import { useSmartBack } from "../../hooks/useSmartBack";
import { ArrowLeft } from "lucide-react";
import { ToggleSwitch } from "../../components/admin/ToggleSwitch";
import {
  useFeatureFlags,
  useToggleFeatureFlag,
  FEATURE_FLAG_DEFS,
  type FeatureFlagCategory,
} from "../../hooks/useFeatureFlags";

// Deliberately excludes "pages" — subsidiaries_enabled and
// page_messaging_enabled are still toggled from AdminPageSettings.tsx
// (see useFeatureFlags.ts), so they're not duplicated here.
const CATEGORY_ORDER: FeatureFlagCategory[] = ["wallet", "promotions", "affiliates"];

const CATEGORY_LABELS: Record<FeatureFlagCategory, string> = {
  pages: "Pages & organisations",
  wallet: "Wallet & money",
  promotions: "Promotions",
  affiliates: "Affiliates",
};

// /admin/feature-flags — the single switchboard for every "release
// this as MVP, keep polishing, flip it on when it's ready" toggle in
// the app. Each switch is an off-switch on a feature that's already
// live, not an opt-in: turning one off only ever blocks NEW activity
// through that feature (new pages, new gifts, new deposits, etc.) —
// whatever already exists (existing pages, past gifts, wallet
// balances, purchase history) stays exactly as it was either way.
//
// Every switch here is enforced server-side too (RPCs, a DB trigger,
// or an edge function check), not just hidden from the UI — so this
// page is a convenience for admins, not the only thing standing
// between a disabled feature and someone using it anyway.
export function AdminFeatureFlags() {
  const smartBack = useSmartBack();
  const { data: flags, isLoading } = useFeatureFlags();
  const toggle = useToggleFeatureFlag();

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Feature flags</h2>
        </div>
        <p className="text-sm text-ink-muted mb-6">
          Turn a feature off to hold it back while it's rough, then switch it on when it's ready.
        </p>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <div className="space-y-6">
            {CATEGORY_ORDER.map((category) => {
              const defsInCategory = FEATURE_FLAG_DEFS.filter((d) => d.category === category);
              if (defsInCategory.length === 0) return null;

              return (
                <div key={category}>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted mb-2 px-1">
                    {CATEGORY_LABELS[category]}
                  </p>
                  <div className="bg-surface rounded-xl border border-border divide-y divide-border">
                    {defsInCategory.map((def) => {
                      const checked = flags?.[def.key] ?? true;
                      return (
                        <div key={def.key} className="flex items-center justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink">{def.label}</p>
                            <p className="text-xs text-ink-muted mt-0.5">{def.description}</p>
                          </div>
                          <ToggleSwitch
                            checked={checked}
                            disabled={toggle.isPending}
                            onChange={(next) => toggle.mutate({ key: def.key, enabled: next })}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
