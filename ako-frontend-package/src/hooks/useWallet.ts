import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import type { GiftType, Wallet } from "../types/database";

export function useWallet() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async (): Promise<Wallet> => {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useGiftTypes() {
  return useQuery({
    queryKey: ["gift-types"],
    queryFn: async (): Promise<GiftType[]> => {
      const { data, error } = await supabase
        .from("gift_types")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useWalletTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wallet-transactions", user?.id],
    queryFn: async () => {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (!wallet) return [];

      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
