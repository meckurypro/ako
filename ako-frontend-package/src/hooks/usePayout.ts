import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export interface PayoutAccount {
  id: string;
  bank_name: string;
  account_number_last4: string;
  account_name: string;
  currency: string;
  is_verified: boolean;
  is_active: boolean;
}

export interface Withdrawal {
  id: string;
  amount_usd: number;
  amount_local: number;
  currency: string;
  status: "processing" | "completed" | "failed" | "reversed";
  failure_reason: string | null;
  created_at: string;
  completed_at: string | null;
}

export function usePayoutAccounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["payout-accounts", user?.id],
    queryFn: async (): Promise<PayoutAccount[]> => {
      const { data, error } = await supabase
        .from("payout_accounts")
        .select("id, bank_name, account_number_last4, account_name, currency, is_verified, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

interface AddPayoutAccountInput {
  account_number: string;
  bank_code: string;
  bank_name: string;
}

/**
 * Calls add-payout-account, which resolves the account with Paystack
 * (confirming it's real and returning the actual name on file) before
 * saving anything. See edge_functions/add-payout-account/index.ts.
 */
export function useAddPayoutAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddPayoutAccountInput) => {
      const { data, error } = await supabase.functions.invoke("add-payout-account", {
        body: input,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data.payout_account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout-accounts"] });
    },
  });
}

export function useWithdrawals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["withdrawals", user?.id],
    queryFn: async (): Promise<Withdrawal[]> => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("id, amount_usd, amount_local, currency, status, failure_reason, created_at, completed_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

interface WithdrawInput {
  amount_usd: number;
  payout_account_id: string;
}

/**
 * Calls process-withdrawal — debits the wallet ledger immediately,
 * then initiates the Paystack transfer. Status stays 'processing'
 * until the paystack-transfer-webhook confirms success or failure.
 * See edge_functions/process-withdrawal/index.ts.
 */
export function useWithdraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: WithdrawInput) => {
      const { data, error } = await supabase.functions.invoke("process-withdrawal", {
        body: input,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
    },
  });
}
