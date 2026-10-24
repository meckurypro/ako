// src/pages/admin/AdminExchangeRates.tsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, History, Timer } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { useExchangeRates } from "../../hooks/useWalletRates";
import { useRateSyncStatus, useSetRateAutoSync, useUpdateExchangeRate } from "../../hooks/useAdminWallet";
import { FormField } from "../../components/FormField";
import { Button } from "../../components/Button";
import { formatNgn } from "../../lib/money";
import { formatCountdown, nextRateSyncAt } from "../../lib/rateSync";
import { friendlyError } from "../../lib/friendlyError";

/**
 * One "1 USD = ₦ [input] [Save]" row. The input takes all the room the button doesn't need —
 * the button is a compact, fixed-size pill (Button's default size is w-full, which used to squeeze the
 * input down to a few characters and truncate the rate).
 */
function RateRow({
  id,
  value,
  onChange,
  onSave,
  saving,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-end gap-3">
      <div className="flex-1 min-w-0">
        <FormField
          id={id}
          label="1 USD = ₦"
          type="number"
          inputMode="decimal"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <Button size="sm" onClick={onSave} loading={saving} className="shrink-0 mb-6 min-w-16">
        Save
      </Button>
    </div>
  );
}

/** Ticking "next automatic update" countdown, driven by the fixed 6-hourly UTC schedule. */
function SyncCountdown({ onWindowElapsed }: { onWindowElapsed: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const target = nextRateSyncAt(now);
  const previousTarget = useRef(target);
  const onElapsedRef = useRef(onWindowElapsed);

  useEffect(() => {
    onElapsedRef.current = onWindowElapsed;
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // A new window started => the cron job has just fired. Refresh the numbers once it's had time to finish.
  useEffect(() => {
    if (previousTarget.current === target) return;
    previousTarget.current = target;
    const timers = [
      setTimeout(() => onElapsedRef.current(), 15_000),
      setTimeout(() => onElapsedRef.current(), 60_000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [target]);

  return (
    <div className="mt-3 inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-accent-soft px-3 py-1.5 text-accent">
      <Timer size={14} />
      <span className="text-xs">Next update in</span>
      <span className="text-sm font-medium tabular-nums">{formatCountdown(target - now)}</span>
      <span className="text-xs text-accent/70">
        ({new Date(target).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })})
      </span>
    </div>
  );
}

export function AdminExchangeRates() {
  const smartBack = useSmartBack();
  const { data: rates, isLoading } = useExchangeRates();
  const updateRate = useUpdateExchangeRate();
  const { data: sync } = useRateSyncStatus();
  const setAutoSync = useSetRateAutoSync();
  const queryClient = useQueryClient();

  function refreshAfterSync() {
    queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
    queryClient.invalidateQueries({ queryKey: ["exchange-rate-sync-status"] });
    queryClient.invalidateQueries({ queryKey: ["exchange-rate-history"] });
    queryClient.invalidateQueries({ queryKey: ["exchange-rate-change-log"] });
  }

  const [depositRate, setDepositRate] = useState("");
  const [withdrawalRate, setWithdrawalRate] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!rates) return;
    setDepositRate(String(rates.deposit));
    setWithdrawalRate(String(rates.withdrawal));
  }, [rates]);

  async function handleSave(kind: "deposit" | "withdrawal") {
    setSavedMsg(null);
    setErrorMsg(null);
    const rateValue = Number(kind === "deposit" ? depositRate : withdrawalRate);

    if (!rateValue || rateValue <= 0) {
      setErrorMsg("Enter a valid rate greater than zero.");
      return;
    }

    try {
      await updateRate.mutateAsync({ kind, rate: rateValue });
      setSavedMsg(
        `${kind === "deposit" ? "Deposit" : "Withdrawal"} rate updated. This only applies to new transactions — past transactions keep the rate they used.`
      );
      setTimeout(() => setSavedMsg(null), 5000);
    } catch (err) {
      setErrorMsg(friendlyError(err, "Couldn't save rate."));
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink flex-1">Exchange rates</h2>
          <Link
            to="/admin/exchange-rates/history"
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3.5 py-1.5 text-sm font-medium text-accent hover:bg-accent-soft/70 transition-colors"
          >
            <History size={16} />
            History
          </Link>
        </div>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div className="bg-surface rounded-xl p-4 border border-border">
              <p className="text-sm font-medium text-ink mb-1">Deposit rate</p>
              <p className="text-xs text-ink-muted mb-3">
                Used when a user converts NGN into USD wallet value. Currently: $1 ={" "}
                {rates ? formatNgn(rates.deposit) : "—"}.
              </p>
              <RateRow
                id="deposit_rate"
                value={depositRate}
                onChange={setDepositRate}
                onSave={() => handleSave("deposit")}
                saving={updateRate.isPending && updateRate.variables?.kind === "deposit"}
              />
            </div>

            <div className="bg-surface rounded-xl p-4 border border-border">
              <p className="text-sm font-medium text-ink mb-1">Withdrawal rate</p>
              <p className="text-xs text-ink-muted mb-3">
                Used when a user converts USD wallet value into the NGN Paystack payout. Currently: $1 ={" "}
                {rates ? formatNgn(rates.withdrawal) : "—"}.
              </p>
              <RateRow
                id="withdrawal_rate"
                value={withdrawalRate}
                onChange={setWithdrawalRate}
                onSave={() => handleSave("withdrawal")}
                saving={updateRate.isPending && updateRate.variables?.kind === "withdrawal"}
              />
            </div>

            {sync && (
              <div className="bg-surface rounded-xl p-4 border border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">Automatic updates</p>
                    <p className="text-xs text-ink-muted mt-1">
                      Every 6 hours both rates follow the live market rate, keeping the gap you last set.
                      {sync.last_market_rate !== null && sync.last_synced_at && (
                        <>
                          {" "}Last market rate: {formatNgn(sync.last_market_rate)} (
                          {new Date(sync.last_synced_at).toLocaleString()}).
                        </>
                      )}
                    </p>
                    {sync.last_status && sync.last_status !== "ok" && (
                      <p className="text-xs text-danger mt-1">Last run: {sync.last_status}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0"
                    onClick={() => setAutoSync.mutate(!sync.auto_sync_enabled)}
                    loading={setAutoSync.isPending}
                  >
                    {sync.auto_sync_enabled ? "Pause" : "Resume"}
                  </Button>
                </div>
                {sync.auto_sync_enabled ? (
                  <SyncCountdown onWindowElapsed={refreshAfterSync} />
                ) : (
                  <p className="text-xs text-ink-muted mt-3">Paused — rates won't change until you resume.</p>
                )}
              </div>
            )}

            {savedMsg && <p className="text-sm text-accent">{savedMsg}</p>}
            {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}

            <p className="text-xs text-ink-muted pt-2">
              These rates are independent — deposit and withdrawal rates don't have to match. Changing
              either only affects transactions created after the change; every past deposit and
              withdrawal keeps the exact rate it used at the time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
