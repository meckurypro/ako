// src/hooks/useWalletRates.ts
//
// Reads the admin-controlled exchange_rates table directly — RLS
// allows any authenticated user to SELECT (rates aren't sensitive),
// but only admins can UPDATE (see the exchange_rates RLS policies
// in the wallet migration). Writing a new rate happens in
// useAdminWallet.ts, gated by the same admin_roles-based policy.
//
// These are DISPLAY-ONLY previews. The actual amount charged/paid
// out is always recomputed server-side (convert_currency()) inside
// initiate-deposit / process-withdrawal at the moment of the real
// transaction — never trust a rate the client fetched a few
// seconds ago for the real charge.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export interface ExchangeRates {
  deposit: number;
  withdrawal: number;
}

export function useExchangeRates() {
  return useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async (): Promise<ExchangeRates> => {
      const { data, error } = await supabase.from("exchange_rates").select("kind, rate");
      if (error) throw error;

      const rates: ExchangeRates = { deposit: 0, withdrawal: 0 };
      for (const row of data ?? []) {
        if (row.kind === "deposit") rates.deposit = Number(row.rate);
        if (row.kind === "withdrawal") rates.withdrawal = Number(row.rate);
      }
      return rates;
    },
    staleTime: 60 * 1000,
  });
}

export interface WithdrawalEligibility {
  wallet_balance: number;
  cap_usd: number;
  already_committed_usd: number;
  available_to_request: number;
  cycle_start: string;
}

/**
 * Live preview of the 50% weekly cap, via the same
 * get_withdrawal_eligibility() RPC process-withdrawal enforces
 * server-side — so this can never show the user a number the
 * server would then reject.
 */
export function useWithdrawalEligibility() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["withdrawal-eligibility", user?.id],
    queryFn: async (): Promise<WithdrawalEligibility> => {
      const { data, error } = await supabase
        .rpc("get_withdrawal_eligibility", { p_user_id: user!.id })
        .single();
      if (error) throw error;
      return data as unknown as WithdrawalEligibility;
    },
    enabled: !!user,
  });
}

/** Today's weekday in the business timezone — Friday opens requests, Saturday runs the batch. */
export function useBusinessWeekday(): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", weekday: "long" }).format(new Date());
}
