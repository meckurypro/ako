// src/components/AffiliateProgramSheet.tsx
import { useEffect, useState } from "react";
import { X, Users } from "lucide-react";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { Portal } from "./Portal";
import { Button } from "./Button";
import { useToast } from "./Toast";
import {
  useAffiliateProgram,
  useSetAffiliateProgram,
  useCreatorAffiliateAnalytics,
} from "../hooks/useAffiliates";
import { useFeatureFlag } from "../hooks/useFeatureFlags";
import { formatUsd } from "../lib/money";

interface AffiliateProgramSheetProps {
  projectId: string;
  projectTitle: string;
  priceUsd: number;
  onClose: () => void;
}

/**
 * Owner-only. Opened from EditProject, same pattern as
 * ManageAccessSheet — a self-contained sub-resource editor with its
 * own save action, rather than folded into EditProject's single big
 * form/save cycle (this settles independently of price/description
 * edits, and shouldn't be blocked on or block them).
 *
 * Commission changes are versioned server-side (see
 * affiliate_commission_versions) — saving a new rate here only ever
 * affects sales from this point forward; past commissions already
 * paid out keep whatever rate was live when they happened.
 */
export function AffiliateProgramSheet({ projectId, projectTitle, priceUsd, onClose }: AffiliateProgramSheetProps) {
  useBackDismiss(onClose);
  const toast = useToast();

  const { data: program, isLoading } = useAffiliateProgram(projectId);
  const { data: analytics } = useCreatorAffiliateAnalytics(projectId);
  const setProgram = useSetAffiliateProgram(projectId);
  // Global switch — manage_affiliate_program only enforces this when
  // turning a program ON, never when turning one off, so an existing
  // program can always be disabled here regardless of this flag.
  const affiliateProgramsEnabled = useFeatureFlag("affiliate_programs_enabled");
  // A free project has nothing for a commission to come out of — same
  // rule as the global switch below: this only blocks turning a
  // program ON, never turning an already-enabled one off, in case a
  // program was enabled back when the project still had a price.
  const isFree = priceUsd <= 0;

  const [enabled, setEnabled] = useState(false);
  const [commissionPct, setCommissionPct] = useState("20");
  const [allowExternalPromotion, setAllowExternalPromotion] = useState(true);
  const [existingForksSurviveDisable, setExistingForksSurviveDisable] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once from whatever's already saved — mirrors EditProject's
  // own hydrated-flag pattern so a slow query response can't stomp on
  // something the creator already started typing.
  useEffect(() => {
    if (hydrated || isLoading) return;
    if (program) {
      setEnabled(program.enabled);
      setAllowExternalPromotion(program.allow_external_promotion);
      setExistingForksSurviveDisable(program.existing_forks_survive_disable);
    }
    setHydrated(true);
  }, [program, isLoading, hydrated]);

  async function handleSave() {
    setError(null);

    if (enabled && !affiliateProgramsEnabled) {
      setError("Affiliate programs are temporarily disabled.");
      return;
    }

    if (enabled && isFree) {
      setError("Free projects can't have an affiliate program — there's no sale for a commission to come from.");
      return;
    }

    const pct = parseFloat(commissionPct);
    if (enabled && (Number.isNaN(pct) || pct <= 0 || pct > 100)) {
      setError("Commission must be a percentage between 0 and 100.");
      return;
    }

    try {
      await setProgram.mutateAsync({
        enabled,
        // Only send a rate when the program is being enabled AND the
        // creator actually changed it from the placeholder default —
        // manage_affiliate_program leaves the last saved rate alone
        // when this is omitted, so disabling/re-enabling without
        // touching the field never silently resets it.
        commissionPct: enabled ? pct / 100 : undefined,
        allowExternalPromotion,
        existingForksSurviveDisable,
      });
      toast(enabled ? "Affiliate program updated." : "Affiliate program disabled.", { variant: "success" });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save affiliate settings.");
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
        <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between px-4 pt-4 pb-2 sticky top-0 bg-surface">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Affiliate program</p>
              <p className="text-xs text-ink-muted truncate">{projectTitle}</p>
            </div>
            <button onClick={onClose} className="text-ink-muted" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="px-4 pb-6">
            {isLoading ? (
              <p className="text-sm text-ink-muted py-6 text-center">Loading…</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-ink-muted shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-ink">Let people earn by sharing this</p>
                      <p className="text-xs text-ink-muted">
                        Anyone can fork it for their own referral link — you only pay a commission on sales it actually brings in.
                      </p>
                      {!enabled && isFree && (
                        <p className="text-xs text-danger mt-1">
                          This project is free — set a price before turning on an affiliate program.
                        </p>
                      )}
                      {!affiliateProgramsEnabled && !enabled && !isFree && (
                        <p className="text-xs text-danger mt-1">
                          Affiliate programs are temporarily disabled platform-wide.
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Turning ON is blocked while the project is
                      // free, or while the global switch is off;
                      // turning an already-on program OFF always
                      // works, matching the server rule.
                      if (!enabled && (isFree || !affiliateProgramsEnabled)) return;
                      setEnabled(!enabled);
                    }}
                    aria-pressed={enabled}
                    disabled={!enabled && (isFree || !affiliateProgramsEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 overflow-hidden disabled:opacity-50 ${
                      enabled ? "bg-accent" : "bg-border"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-canvas transition-[left] ${
                        enabled ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                {enabled && (
                  <>
                    <div className="mt-4 mb-2">
                      <label className="block text-sm font-medium text-ink-muted mb-1.5">
                        Commission (% of your take-home per sale)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={commissionPct}
                          onChange={(e) => setCommissionPct(e.target.value)}
                          min={1}
                          max={100}
                          step="1"
                          className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink pr-9
                            focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted text-sm">%</span>
                      </div>
                      <p className="text-xs text-ink-muted mt-1.5">
                        Comes out of your share after the platform fee — buyers always pay the same price either way.
                        Changing this only affects sales from now on; past commissions keep the rate they were made at.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-sm text-accent font-medium mt-2 mb-1"
                    >
                      {showAdvanced ? "Hide advanced options" : "Advanced options"}
                    </button>

                    {showAdvanced && (
                      <div className="flex flex-col gap-4 mt-2 mb-2 p-3 rounded-xl bg-canvas border border-border">
                        <label className="flex items-start gap-2.5 text-sm text-ink">
                          <input
                            type="checkbox"
                            checked={allowExternalPromotion}
                            onChange={(e) => setAllowExternalPromotion(e.target.checked)}
                            className="mt-0.5 rounded border-border"
                          />
                          <span>
                            Allow affiliates to promote this off Akọ (social media, blogs, etc.), not just by
                            sharing within the app.
                          </span>
                        </label>
                        <label className="flex items-start gap-2.5 text-sm text-ink">
                          <input
                            type="checkbox"
                            checked={existingForksSurviveDisable}
                            onChange={(e) => setExistingForksSurviveDisable(e.target.checked)}
                            className="mt-0.5 rounded border-border"
                          />
                          <span>
                            If I turn this off later, let people who already forked it keep earning — only stop
                            new people from forking it.
                          </span>
                        </label>
                      </div>
                    )}
                  </>
                )}

                {analytics?.program_exists && (
                  <div className="grid grid-cols-3 gap-2 mt-5 mb-1">
                    <StatTile label="Affiliates" value={String(analytics.total_affiliates ?? 0)} />
                    <StatTile label="Sales" value={String(analytics.conversions ?? 0)} />
                    <StatTile
                      label="Paid out"
                      value={formatUsd(analytics.total_affiliate_commissions ?? 0)}
                    />
                  </div>
                )}

                {error && (
                  <p className="text-danger text-sm mt-4" role="alert">
                    {error}
                  </p>
                )}

                <div className="mt-6">
                  <Button onClick={() => void handleSave()} loading={setProgram.isPending}>
                    Save
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-canvas rounded-xl border border-border p-3 text-center">
      <p className="font-display text-base text-ink truncate">{value}</p>
      <p className="text-[11px] text-ink-muted mt-0.5">{label}</p>
    </div>
  );
}
