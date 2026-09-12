// src/pages/FundWallet.tsx
import { useState, useMemo } from "react";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { useSmartBack } from "../hooks/useSmartBack";
import { useExchangeRates } from "../hooks/useWalletRates";
import { useInitiateDeposit } from "../hooks/useDeposits";
import { formatNgn, formatUsd } from "../lib/money";

// Deposits used to be Apple/Google in-app purchases (verify-iap-receipt).
// That path never worked outside a native app shell, and per product
// decision, it's been fully replaced with Paystack — NGN in, USD out,
// available every day at any time, no App Store/Play Console setup
// required. verify-iap-receipt and the IAP product IDs are no longer
// referenced from this page.
const PRESET_AMOUNTS = [5, 10, 25, 50, 100];
const MINIMUM_DEPOSIT_USD = 1;

export function FundWallet() {
  const smartBack = useSmartBack();
  const { data: rates } = useExchangeRates();
  const initiateDeposit = useInitiateDeposit();

  const [selectedPreset, setSelectedPreset] = useState<number | null>(10);
  const [customAmount, setCustomAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const amountUsd = customAmount ? Number(customAmount) : selectedPreset ?? 0;

  // Display-only preview — the real NGN amount charged is always
  // recomputed server-side by initiate-deposit at the moment of
  // payment, via convert_currency(). This is just so the user isn't
  // surprised by what Paystack shows them next.
  const previewNgn = useMemo(() => {
    if (!rates?.deposit || !amountUsd) return null;
    return amountUsd * rates.deposit;
  }, [rates?.deposit, amountUsd]);

  function selectPreset(usd: number) {
    setSelectedPreset(usd);
    setCustomAmount("");
    setErrorMessage(null);
  }

  function handleCustomChange(value: string) {
    // Digits and a single decimal point only.
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setCustomAmount(value);
      setSelectedPreset(null);
      setErrorMessage(null);
    }
  }

  async function handleContinue() {
    setErrorMessage(null);

    if (!amountUsd || amountUsd < MINIMUM_DEPOSIT_USD) {
      setErrorMessage(`Minimum deposit is ${formatUsd(MINIMUM_DEPOSIT_USD)}.`);
      return;
    }

    try {
      const result = await initiateDeposit.mutateAsync(amountUsd);
      // Paystack's hosted checkout — handles card / bank transfer /
      // USSD itself, then redirects back to /wallet/deposit/callback.
      window.location.href = result.authorization_url;
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't start payment.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={smartBack} className="text-ink-muted mb-4">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-2">Fund your wallet</h2>
        <p className="text-ink-muted text-sm mb-6">
          Add money to your Akọ wallet via card, bank transfer, or USSD — powered by Paystack.
          Available any time, every day.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {PRESET_AMOUNTS.map((usd) => (
            <button
              key={usd}
              onClick={() => selectPreset(usd)}
              className={`rounded-xl py-4 text-center border transition-colors ${
                selectedPreset === usd
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-surface hover:border-accent/50"
              }`}
            >
              <p className="font-display text-xl text-ink">{formatUsd(usd)}</p>
            </button>
          ))}

          <button
            onClick={() => {
              setSelectedPreset(null);
              setErrorMessage(null);
            }}
            className={`rounded-xl py-4 text-center border transition-colors ${
              selectedPreset === null
                ? "border-accent bg-accent-soft"
                : "border-border bg-surface hover:border-accent/50"
            }`}
          >
            <p className="font-display text-sm text-ink">Custom</p>
          </button>
        </div>

        {selectedPreset === null && (
          <div className="mb-6">
            <label className="text-sm text-ink-muted mb-1.5 block">Amount (USD)</label>
            <div className="flex items-center bg-surface border border-border rounded-xl px-4">
              <span className="text-ink-muted mr-1">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={customAmount}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent py-3 text-ink outline-none"
                autoFocus
              />
            </div>
          </div>
        )}

        {amountUsd > 0 && (
          <div className="bg-surface border border-border rounded-xl p-4 mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-ink-muted">Add to wallet</span>
              <span className="text-ink font-medium">{formatUsd(amountUsd)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">You'll be charged</span>
              <span className="text-ink font-medium">
                {previewNgn !== null ? formatNgn(previewNgn) : "…"}
              </span>
            </div>
            {rates?.deposit ? (
              <p className="text-xs text-ink-muted mt-2">
                Rate: $1 = {formatNgn(rates.deposit)}
              </p>
            ) : null}
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={initiateDeposit.isPending || !amountUsd}
          className="w-full bg-accent text-canvas font-medium rounded-xl py-3.5 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {initiateDeposit.isPending ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Starting payment…
            </>
          ) : (
            "Continue to payment"
          )}
        </button>

        {errorMessage && (
          <div className="flex gap-2 bg-danger/10 text-danger text-sm rounded-xl p-3 mt-4">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
