// src/pages/admin/AdminPayouts.tsx
import { useState } from "react";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { usePayoutDashboard, useProcessSaturdayPayouts } from "../../hooks/useAdminWallet";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Button } from "../../components/Button";
import { formatNgn, formatUsd } from "../../lib/money";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="text-ink font-medium">{value}</span>
    </div>
  );
}

export function AdminPayouts() {
  const smartBack = useSmartBack();
  const { data: dashboard, isLoading, error } = usePayoutDashboard();
  const processPayouts = useProcessSaturdayPayouts();

  const [showConfirm, setShowConfirm] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleProcess() {
    setShowConfirm(false);
    setErrorMsg(null);
    setResultMsg(null);
    try {
      const result = await processPayouts.mutateAsync();
      setResultMsg(
        `Batch processed: ${result.initiated} transfer(s) initiated (${formatUsd(result.total_usd)} / ${formatNgn(
          result.total_ngn
        )})${result.failed_immediately ? `, ${result.failed_immediately} failed immediately` : ""}.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Couldn't process payouts.");
    }
  }

  const batchAlreadyDone = dashboard?.batch?.status === "completed";
  const canProcess = dashboard?.is_saturday && dashboard.pending_withdrawal_count > 0 && !batchAlreadyDone;

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Saturday payouts</h2>
        </div>

        {isLoading && <p className="text-ink-muted text-center py-10">Loading…</p>}
        {error && <p className="text-danger text-center py-10">Couldn't load payout dashboard.</p>}

        {dashboard && (
          <>
            {!dashboard.is_saturday && (
              <div className="flex gap-2 bg-accent-soft text-accent text-sm rounded-xl p-3 mb-4">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <p>Payouts can only be processed on Saturdays. You can still review the numbers below.</p>
              </div>
            )}

            {batchAlreadyDone && (
              <div className="flex gap-2 bg-accent-soft text-accent text-sm rounded-xl p-3 mb-4">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <p>
                  Today's batch was already processed at{" "}
                  {dashboard.batch?.completed_at ? new Date(dashboard.batch.completed_at).toLocaleTimeString() : ""}{" "}
                  — {dashboard.batch?.withdrawal_count} withdrawal(s), {formatUsd(dashboard.batch?.total_usd ?? 0)}.
                </p>
              </div>
            )}

            <div className="bg-surface rounded-xl p-4 border border-border mb-4">
              <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1">
                This week's requests
              </p>
              <Row label="Withdrawal requests" value={String(dashboard.pending_withdrawal_count)} />
              <Row label="Total USD requested" value={formatUsd(dashboard.total_usd_requested)} />
              <Row label="Withdrawal rate" value={dashboard.withdrawal_rate ? `$1 = ${formatNgn(dashboard.withdrawal_rate)}` : "—"} />
              <Row label="NGN required" value={formatNgn(dashboard.total_ngn_required)} />
            </div>

            <div className="bg-surface rounded-xl p-4 border border-border mb-4">
              <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1">
                Today's batch progress
              </p>
              <Row label="Amount processed" value={formatUsd(dashboard.amount_processed_usd)} />
              <Row label="Remaining" value={formatUsd(dashboard.remaining_usd)} />
            </div>

            <div className="bg-surface rounded-xl p-4 border border-border mb-4">
              <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1">
                Paystack liquidity
              </p>
              {dashboard.paystack_error ? (
                <p className="text-sm text-danger py-2">{dashboard.paystack_error}</p>
              ) : (
                <>
                  <Row
                    label="Paystack available balance"
                    value={dashboard.paystack_available_ngn !== null ? formatNgn(dashboard.paystack_available_ngn) : "—"}
                  />
                  <Row
                    label="Shortfall"
                    value={
                      dashboard.shortfall_ngn !== null
                        ? dashboard.shortfall_ngn > 0
                          ? formatNgn(dashboard.shortfall_ngn)
                          : "None — fully funded"
                        : "—"
                    }
                  />
                </>
              )}
            </div>

            <div className="bg-surface rounded-xl p-4 border border-border mb-4">
              <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1">
                Total Akọ liability
              </p>
              <Row label="Total wallet balances" value={formatUsd(dashboard.total_wallet_balances_usd)} />
            </div>

            {resultMsg && <p className="text-sm text-accent mb-4">{resultMsg}</p>}
            {errorMsg && <p className="text-sm text-danger mb-4">{errorMsg}</p>}

            <Button
              onClick={() => setShowConfirm(true)}
              disabled={!canProcess}
              loading={processPayouts.isPending}
            >
              {batchAlreadyDone
                ? "Today's batch already processed"
                : !dashboard.is_saturday
                ? "Only available on Saturdays"
                : dashboard.pending_withdrawal_count === 0
                ? "No pending withdrawals"
                : "Process Saturday Payouts"}
            </Button>
          </>
        )}

        {showConfirm && (
          <ConfirmDialog
            title="Process Saturday payouts?"
            description={`This initiates real Paystack transfers for ${dashboard?.pending_withdrawal_count ?? 0} withdrawal request(s) totaling ${formatUsd(
              dashboard?.total_usd_requested ?? 0
            )} (${formatNgn(dashboard?.total_ngn_required ?? 0)}). This can't be run again for today once started.`}
            confirmLabel="Process payouts"
            danger={false}
            onConfirm={handleProcess}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </div>
    </div>
  );
}
