// src/components/ErrorNotice.tsx
//
// One way to tell the person a request failed:
//   const notifyError = useErrorNotice();
//   notifyError(err, "Purchase failed.");
//
// A low wallet balance opens a themed dialog with a one-tap "Fund wallet" (a dead-end red line under the button was
// the old behaviour); every other failure is a toast. Both sanitise the backend's wording first (see friendlyError),
// so ids, table names and raw SQL never reach the screen.
//
// Mounted inside <ToastProvider>. It sits above the router, so the dialog's "Fund wallet" goes through `onFund`
// (App.tsx passes router.navigate) rather than a hook that needs a router context.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import { classifyError, type ClassifiedError } from "../lib/friendlyError";
import { runAfterDismiss } from "../hooks/useBackDismiss";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";

type NotifyFn = (error: unknown, fallback: string) => void;

const ErrorNoticeContext = createContext<NotifyFn | null>(null);

function lowBalanceDescription(e: ClassifiedError): string {
  if (e.needed != null && e.balance != null) {
    return `This costs $${e.needed.toFixed(2)} and your wallet has $${Math.max(e.balance, 0).toFixed(2)}. Fund your wallet, then try again.`;
  }
  return "Your wallet balance is too low for this. Fund your wallet, then try again.";
}

export function ErrorNoticeProvider({ children, onFund }: { children: ReactNode; onFund: () => void }) {
  const toast = useToast();
  const [lowBalance, setLowBalance] = useState<ClassifiedError | null>(null);

  const notifyError = useCallback<NotifyFn>(
    (error, fallback) => {
      const classified = classifyError(error, fallback);
      if (classified.kind === "insufficient_balance") {
        setLowBalance(classified);
        return;
      }
      toast(classified.message, { variant: "error" });
    },
    [toast]
  );

  return (
    <ErrorNoticeContext.Provider value={notifyError}>
      {children}
      {lowBalance ? (
        <ConfirmDialog
          themed
          danger={false}
          title="Add funds to continue"
          description={lowBalanceDescription(lowBalance)}
          confirmLabel="Fund wallet"
          cancelLabel="Not now"
          onCancel={() => setLowBalance(null)}
          onConfirm={() => {
            // The dialog pops its own history entry on unmount (useBackDismiss). Navigating first would let that
            // pop remove the /wallet/fund entry we just pushed — the CTA "did nothing". Wait for the dismiss.
            runAfterDismiss(() => setLowBalance(null), onFund);
          }}
        />
      ) : null}
    </ErrorNoticeContext.Provider>
  );
}

export function useErrorNotice(): NotifyFn {
  const ctx = useContext(ErrorNoticeContext);
  if (!ctx) throw new Error("useErrorNotice must be used within <ErrorNoticeProvider>");
  return ctx;
}
