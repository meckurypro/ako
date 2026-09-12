// src/hooks/useAdminWallet.ts
//
// Admin-only wallet controls: updating the deposit/withdrawal
// exchange rates, and the Saturday payout dashboard + batch run.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

/**
 * Direct table UPDATE, gated by the exchange_rates RLS policy
 * ("Admins can update rates" — requires an admin_roles row for
 * auth.uid()). No edge function needed: the rate itself isn't a
 * secret, and RLS is the actual enforcement boundary, matching how
 * other admin-only tables in this app are already protected.
 * Changing a rate here only affects transactions created AFTER
 * this write — every past deposit/withdrawal already has its own
 * rate frozen onto its own row.
 */
export function useUpdateExchangeRate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    meta: { blocking: true },
    mutationFn: async ({ kind, rate }: { kind: "deposit" | "withdrawal"; rate: number }) => {
      const { error } = await supabase
        .from("exchange_rates")
        .update({ rate, updated_at: new Date().toISOString(), updated_by: user?.id })
        .eq("kind", kind);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
    },
  });
}

export interface PayoutBatchSummary {
  id: string;
  status: "processing" | "completed";
  withdrawal_count: number;
  total_usd: number;
  total_ngn: number;
  started_at: string;
  completed_at: string | null;
}

export interface PayoutDashboard {
  run_date: string;
  is_saturday: boolean;
  total_wallet_balances_usd: number;
  pending_withdrawal_count: number;
  total_usd_requested: number;
  total_ngn_required: number;
  withdrawal_rate: number | null;
  batch: PayoutBatchSummary | null;
  amount_processed_usd: number;
  remaining_usd: number;
  paystack_available_ngn: number | null;
  paystack_error: string | null;
  shortfall_ngn: number | null;
}

export function usePayoutDashboard() {
  return useQuery({
    queryKey: ["payout-dashboard"],
    queryFn: async (): Promise<PayoutDashboard> => {
      const { data, error } = await supabase.functions.invoke("get-payout-dashboard", { method: "GET" });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    // Refresh often on the admin payout screen — this is a
    // money-critical live number, not a cached preference.
    refetchInterval: 30 * 1000,
  });
}

interface ProcessPayoutsResult {
  batch_id: string;
  run_date: string;
  initiated: number;
  failed_immediately: number;
  total_usd: number;
  total_ngn: number;
  message: string;
}

/**
 * Calls process-saturday-payouts. Safe to call at most once
 * successfully per calendar day — the payout_batches.run_date
 * UNIQUE constraint rejects a second run, and this hook surfaces
 * that rejection as a normal error rather than retrying.
 * See edge_functions/process-saturday-payouts/index.ts.
 */
export function useProcessSaturdayPayouts() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { blocking: true },
    mutationFn: async (): Promise<ProcessPayoutsResult> => {
      const { data, error } = await supabase.functions.invoke("process-saturday-payouts", {
        method: "POST",
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout-dashboard"] });
    },
  });
}
