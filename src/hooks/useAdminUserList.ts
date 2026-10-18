// src/hooks/useAdminUserList.ts
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

/** Users per page on the admin list — fixed so the page never needs to scroll. */
export const USER_LIST_PAGE_SIZE = 8;

/**
 * Which slice of users a Growth card represents. Must stay in sync with the
 * `p_filter` values in supabase/ako_admin_list_users.sql, which mirror the
 * numbers produced by admin_user_stats().
 */
export const USER_LIST_FILTERS = {
  all: "All users",
  today: "New today",
  this_week: "New this week",
  this_month: "New this month",
  last_7: "New (last 7 days)",
  last_30: "New (last 30 days)",
  active_day: "Active (24h)",
  active_week: "Active (7d)",
  active_month: "Active (30d)",
} as const;

export type UserListFilter = keyof typeof USER_LIST_FILTERS;

export function isUserListFilter(v: string | null): v is UserListFilter {
  return !!v && Object.prototype.hasOwnProperty.call(USER_LIST_FILTERS, v);
}

export interface AdminUserRow {
  id: string;
  display_name: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  account_status: "pending" | "approved" | "declined" | "suspended";
  is_verified: boolean;
  created_at: string;
  last_seen_at: string | null;
}

export interface AdminUserPage {
  rows: AdminUserRow[];
  total: number;
}

/** One page of users for a Growth card, via the admin-only admin_list_users RPC. */
export function useAdminUserList(filter: UserListFilter, page: number) {
  return useQuery({
    queryKey: ["admin-user-list", filter, page],
    queryFn: async (): Promise<AdminUserPage> => {
      const fetchPage = async (limit: number, offset: number) => {
        const { data, error } = await supabase.rpc("admin_list_users", {
          p_filter: filter,
          p_limit: limit,
          p_offset: offset,
        });
        if (error) throw error;
        return (data ?? []) as (AdminUserRow & { total_count: number })[];
      };

      const raw = await fetchPage(USER_LIST_PAGE_SIZE, (page - 1) * USER_LIST_PAGE_SIZE);
      let total = raw.length > 0 ? Number(raw[0].total_count) : 0;

      // The total rides along on each returned row, so a page past the end (stale
      // ?page=, or the list shrank) returns nothing and no total. Recover the real
      // total with a one-row fetch so the UI can snap back to the last page.
      if (raw.length === 0 && page > 1) {
        const first = await fetchPage(1, 0);
        total = first.length > 0 ? Number(first[0].total_count) : 0;
      }

      return {
        rows: raw.map(({ total_count: _t, ...row }) => row),
        total,
      };
    },
    // Keep the previous page on screen while the next one loads — no flicker.
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}
