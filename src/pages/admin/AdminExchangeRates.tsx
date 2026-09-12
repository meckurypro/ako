// src/pages/admin/AdminExchangeRates.tsx
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { useExchangeRates } from "../../hooks/useWalletRates";
import { useUpdateExchangeRate } from "../../hooks/useAdminWallet";
import { FormField } from "../../components/FormField";
import { Button } from "../../components/Button";
import { formatNgn } from "../../lib/money";

export function AdminExchangeRates() {
  const smartBack = useSmartBack();
  const { data: rates, isLoading } = useExchangeRates();
  const updateRate = useUpdateExchangeRate();

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
      setErrorMsg(err instanceof Error ? err.message : "Couldn't save rate.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Exchange rates</h2>
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
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FormField
                    id="deposit_rate"
                    label="1 USD = ₦"
                    type="number"
                    value={depositRate}
                    onChange={(e) => setDepositRate(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => handleSave("deposit")}
                  loading={updateRate.isPending}
                  className="mb-4"
                >
                  Save
                </Button>
              </div>
            </div>

            <div className="bg-surface rounded-xl p-4 border border-border">
              <p className="text-sm font-medium text-ink mb-1">Withdrawal rate</p>
              <p className="text-xs text-ink-muted mb-3">
                Used when a user converts USD wallet value into the NGN Paystack payout. Currently: $1 ={" "}
                {rates ? formatNgn(rates.withdrawal) : "—"}.
              </p>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FormField
                    id="withdrawal_rate"
                    label="1 USD = ₦"
                    type="number"
                    value={withdrawalRate}
                    onChange={(e) => setWithdrawalRate(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => handleSave("withdrawal")}
                  loading={updateRate.isPending}
                  className="mb-4"
                >
                  Save
                </Button>
              </div>
            </div>

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
