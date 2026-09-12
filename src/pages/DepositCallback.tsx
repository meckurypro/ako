// src/pages/DepositCallback.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useVerifyDeposit } from "../hooks/useDeposits";
import { formatUsd } from "../lib/money";

/**
 * Landing page for Paystack's checkout redirect
 * (initiate-deposit sets callback_url to /wallet/deposit/callback?reference=...).
 *
 * This calls verify-deposit as the user-facing confirmation path —
 * paystack-charge-webhook is the authoritative one and is often
 * faster, but a user sitting here shouldn't have to guess whether
 * their money landed. Both are idempotent against the same deposit
 * row, so calling verify-deposit here is always safe even if the
 * webhook already credited the wallet.
 */
export function DepositCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");
  const verifyDeposit = useVerifyDeposit();
  const [result, setResult] = useState<"pending" | "success" | "failed" | "error">("pending");
  const [creditedUsd, setCreditedUsd] = useState<number | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (!reference || attempted.current) return;
    attempted.current = true;

    verifyDeposit.mutate(reference, {
      onSuccess: (data) => {
        if (data.status === "success") {
          setResult("success");
          setCreditedUsd(data.amount_usd ?? null);
        } else if (data.status === "failed") {
          setResult("failed");
        } else {
          // Paystack hasn't confirmed yet — rare, but possible if the
          // user is redirected before their bank transfer clears.
          setResult("pending");
        }
      },
      onError: () => setResult("error"),
    });
  }, [reference, verifyDeposit]);

  if (!reference) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
        <p className="text-ink-muted text-center">Missing payment reference.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        {verifyDeposit.isPending && (
          <>
            <Loader2 size={40} className="animate-spin text-accent mx-auto mb-4" />
            <p className="text-ink font-medium">Confirming your payment…</p>
            <p className="text-ink-muted text-sm mt-1">This only takes a moment.</p>
          </>
        )}

        {!verifyDeposit.isPending && result === "success" && (
          <>
            <CheckCircle2 size={44} className="text-accent mx-auto mb-4" />
            <p className="text-ink font-display text-xl mb-1">Wallet funded</p>
            <p className="text-ink-muted text-sm mb-6">
              {creditedUsd !== null
                ? `${formatUsd(creditedUsd)} has been added to your wallet.`
                : "Your deposit was successful."}
            </p>
            <button
              onClick={() => navigate("/wallet")}
              className="bg-accent text-canvas font-medium rounded-xl px-6 py-3"
            >
              Go to wallet
            </button>
          </>
        )}

        {!verifyDeposit.isPending && (result === "failed" || result === "error") && (
          <>
            <XCircle size={44} className="text-danger mx-auto mb-4" />
            <p className="text-ink font-display text-xl mb-1">
              {result === "failed" ? "Payment not completed" : "Couldn't confirm payment"}
            </p>
            <p className="text-ink-muted text-sm mb-6">
              {result === "failed"
                ? "Your card or transfer wasn't successful. No funds were added."
                : "We couldn't verify this payment right now. If money left your account, it will still be credited automatically once confirmed."}
            </p>
            <button
              onClick={() => navigate("/wallet/fund")}
              className="bg-accent text-canvas font-medium rounded-xl px-6 py-3"
            >
              Try again
            </button>
          </>
        )}

        {!verifyDeposit.isPending && result === "pending" && (
          <>
            <Loader2 size={40} className="text-ink-muted mx-auto mb-4" />
            <p className="text-ink font-medium">Still processing</p>
            <p className="text-ink-muted text-sm mb-6">
              Your payment is still being confirmed. It'll be credited automatically — check your
              wallet in a few minutes.
            </p>
            <button
              onClick={() => navigate("/wallet")}
              className="bg-accent text-canvas font-medium rounded-xl px-6 py-3"
            >
              Go to wallet
            </button>
          </>
        )}
      </div>
    </div>
  );
}
