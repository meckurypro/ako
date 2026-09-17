// src/hooks/useAdminAccountReviewCount.ts
//
// Lightweight pending-count for the AdminHome badge — same
// admin_list_pending_accounts RPC the full queue page uses, so the
// count can never drift from what the queue actually shows.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export function usePendingAccountCount() {
  return useQuery({
    queryKey: ["admin-pending-account-count"],
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc("admin_list_pending_accounts", {
        p_search: null,
        p_limit: 200,
        p_offset: 0,
      });
      if (error) throw error;
      return (data ?? []).length;
    },
    staleTime: 30_000,
  });
}
