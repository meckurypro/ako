import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import {
  usePayoutAccounts,
  useAddPayoutAccount,
  useWithdrawals,
  useWithdraw,
} from "../hooks/usePayout";
import { useWallet } from "../hooks/useWallet";
import { Button } from "../components/Button";
import { FormField } from "../components/FormField";

const MINIMUM_WITHDRAWAL_USD = 10;

/**
 * Live bank list from Paystack, via the list-banks edge function —
 * replaces the earlier hardcoded 8-bank list. Cached for the session
 * since bank lists change rarely (the edge function itself also sets
 * a 24h Cache-Control header).
 */
function useBankList() {
  return useQuery({
    queryKey: ["bank-list"],
    queryFn: async (): Promise<{ name: string; code: string }[]> => {
      const { data, error } = await supabase.functions.invoke("list-banks");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.banks;
    },
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Debounced live account-name resolution as the user finishes typing
 * an account number — calls resolve-bank-account (no side effects,
 * unlike add-payout-account which also creates a Paystack recipient).
 */
function useResolvedAccountName(bankCode: string, accountNumber: string) {
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    setResolvedName(null);
    setResolveError(null);

    if (accountNumber.length !== 10 || !bankCode) return;

    const timeout = setTimeout(async () => {
      setResolving(true);
      const { data, error } = await supabase.functions.invoke("resolve-bank-account", {
        body: { account_number: accountNumber, bank_code: bankCode },
      });
      setResolving(false);

      if (error || data?.error) {
        setResolveError("Couldn't verify this account.");
        return;
      }
      setResolvedName(data.account_name);
    }, 600); // debounce — avoid firing on every keystroke

    return () => clearTimeout(timeout);
  }, [bankCode, accountNumber]);

  return { resolvedName, resolving, resolveError };
}

const STATUS_STYLES: Record<string, string> = {
  processing: "text-accent bg-accent-soft",
  completed: "text-accent bg-accent-soft",
  failed: "text-danger bg-danger/10",
  reversed: "text-danger bg-danger/10",
};

export function Withdraw() {
  const navigate = useNavigate();
  const { data: wallet } = useWallet();
  const { data: payoutAccounts, isLoading: accountsLoading } = usePayoutAccounts();
  const { data: withdrawals } = useWithdrawals();
  const { data: banks, isLoading: banksLoading } = useBankList();
  const addAccount = useAddPayoutAccount();
  const withdraw = useWithdraw();

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Add-account form state
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [addAccountError, setAddAccountError] = useState<string | null>(null);

  const { resolvedName, resolving, resolveError } = useResolvedAccountName(bankCode, accountNumber);

  useEffect(() => {
    if (banks && banks.length > 0 && !bankCode) {
      setBankCode(banks[0].code);
    }
  }, [banks, bankCode]);

  const activeAccounts = payoutAccounts?.filter((a) => a.is_verified) ?? [];

  async function handleAddAccount(e: FormEvent) {
    e.preventDefault();
    setAddAccountError(null);

    const bank = banks?.find((b) => b.code === bankCode);
    if (!bank) {
      setAddAccountError("Choose a bank.");
      return;
    }
    if (!resolvedName) {
      setAddAccountError("Enter a valid account number first — we'll confirm the name.");
      return;
    }

    try {
      await addAccount.mutateAsync({
        account_number: accountNumber,
        bank_code: bankCode,
        bank_name: bank.name,
      });
      setShowAddAccount(false);
      setAccountNumber("");
    } catch (err) {
      setAddAccountError(err instanceof Error ? err.message : "Couldn't add this account.");
    }
  }

  async function handleWithdraw() {
    setError(null);
    const amountUsd = parseFloat(amount);

    if (!selectedAccountId) {
      setError("Choose a bank account first.");
      return;
    }
    if (!amountUsd || amountUsd < MINIMUM_WITHDRAWAL_USD) {
      setError(`Minimum withdrawal is $${MINIMUM_WITHDRAWAL_USD}.`);
      return;
    }
    if (wallet && amountUsd > Number(wallet.balance)) {
      setError("That's more than your available balance.");
      return;
    }

    try {
      await withdraw.mutateAsync({ amount_usd: amountUsd, payout_account_id: selectedAccountId });
      setAmount("");
      navigate("/wallet");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="text-ink-muted mb-4">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-1">Withdraw</h2>
        <p className="text-ink-muted text-sm mb-6">
          Available balance: ${Number(wallet?.balance ?? 0).toFixed(2)}
        </p>

        <h3 className="text-sm font-medium text-ink-muted mb-2">Payout account</h3>

        {accountsLoading ? (
          <p className="text-ink-muted text-sm">Loading…</p>
        ) : (
          <div className="space-y-2 mb-4">
            {activeAccounts.map((account) => (
              <button
                key={account.id}
                onClick={() => setSelectedAccountId(account.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border ${
                  selectedAccountId === account.id
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-surface"
                }`}
              >
                <p className="text-sm font-medium text-ink">{account.bank_name}</p>
                <p className="text-xs text-ink-muted">
                  {account.account_name} •••• {account.account_number_last4}
                </p>
              </button>
            ))}

            <button
              onClick={() => setShowAddAccount((s) => !s)}
              className="flex items-center gap-1.5 text-sm text-accent font-medium px-1 py-2"
            >
              <Plus size={16} />
              Add bank account
            </button>
          </div>
        )}

        {showAddAccount && (
          <form onSubmit={handleAddAccount} className="bg-surface rounded-xl p-4 mb-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-ink-muted mb-1.5">Bank</label>
              {banksLoading ? (
                <p className="text-sm text-ink-muted">Loading banks…</p>
              ) : (
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink"
                >
                  {banks?.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <FormField
              id="account_number"
              label="Account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              maxLength={10}
              required
            />

            {/* Live account-name resolution — the "is this you?" confirmation */}
            {resolving && <p className="text-sm text-ink-muted mb-3">Checking account…</p>}
            {resolvedName && (
              <p className="text-sm text-accent mb-3">
                Account name: <span className="font-medium">{resolvedName}</span>
              </p>
            )}
            {resolveError && <p className="text-sm text-danger mb-3">{resolveError}</p>}

            {addAccountError && (
              <p className="text-danger text-sm mb-3">{addAccountError}</p>
            )}

            <Button type="submit" loading={addAccount.isPending} disabled={!resolvedName}>
              Confirm and add
            </Button>
          </form>
        )}

        <h3 className="text-sm font-medium text-ink-muted mb-2 mt-2">Amount (USD)</h3>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="10.00"
          min={MINIMUM_WITHDRAWAL_USD}
          step="0.01"
          className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink mb-4
            focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
        />

        {error && <p className="text-danger text-sm mb-4">{error}</p>}

        <Button onClick={handleWithdraw} loading={withdraw.isPending} disabled={activeAccounts.length === 0}>
          Withdraw
        </Button>

        {withdrawals && withdrawals.length > 0 && (
          <>
            <h3 className="font-display text-lg text-ink mt-8 mb-3">History</h3>
            <div className="space-y-1">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="text-sm text-ink">
                      ${Number(w.amount_usd).toFixed(2)} → {w.currency} {Number(w.amount_local).toFixed(2)}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {new Date(w.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[w.status]}`}
                  >
                    {w.status}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
