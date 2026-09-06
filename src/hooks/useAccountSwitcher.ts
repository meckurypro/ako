// src/hooks/useAccountSwitcher.ts
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import {
  listSavedAccounts,
  removeSavedAccount as removeSavedAccountFromStorage,
  saveAccount,
  type SavedAccount,
} from "../lib/accountSessions";

/**
 * The device's saved-account list, re-read after anything that could
 * change it (switching, adding, removing, or just the current user's
 * own profile fields changing — so the switcher's avatar/name for
 * "you" stay current without a manual refresh() call everywhere).
 */
export function useSavedAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<SavedAccount[]>(() => listSavedAccounts());

  function refresh() {
    setAccounts(listSavedAccounts());
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { accounts, refresh };
}

/**
 * Swaps the live Supabase session to a saved account's cached tokens —
 * no re-entering a password, no network round trip beyond Supabase's
 * own token validation. useAuth's onAuthStateChange listener picks up
 * the swap automatically and updates session/user/profile from it.
 *
 * A full query cache clear is deliberate here rather than relying on
 * every query already being keyed by user id — most are, but an
 * account switch is rare enough that paying for a full refetch is a
 * much smaller risk than one overlooked query silently showing the
 * previous account's cached data under the new one.
 */
export function useSwitchAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: SavedAccount) => {
      const { error } = await supabase.auth.setSession({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useRemoveSavedAccount() {
  return useMutation({
    mutationFn: async (userId: string) => {
      removeSavedAccountFromStorage(userId);
    },
  });
}

interface AddAccountInput {
  email: string;
  password: string;
}

/**
 * Signs into a SECOND personal account, snapshots both it and whoever
 * was active a moment ago into the saved-accounts cache, links them
 * server-side for future cross-device continuity (see
 * sql/26_account_links.sql), and leaves the newly-added account active
 * — matching how Instagram/TikTok drop you into the account you just
 * added rather than back into the one you started on.
 */
export function useAddAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: AddAccountInput) => {
      const { data: currentSessionData } = await supabase.auth.getSession();
      const previousSession = currentSessionData.session;

      // Snapshot whoever was active BEFORE this call — signInWithPassword
      // below is about to replace the client's live session, and this is
      // the last point where the outgoing account's tokens are available
      // to save. Without this, adding a second account would silently
      // drop the first one out of the switcher.
      if (previousSession) {
        const { data: previousProfile } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .eq("id", previousSession.user.id)
          .single();
        if (previousProfile) {
          saveAccount({
            user_id: previousProfile.id,
            username: previousProfile.username,
            display_name: previousProfile.display_name,
            avatar_url: previousProfile.avatar_url,
            access_token: previousSession.access_token,
            refresh_token: previousSession.refresh_token,
          });
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session) throw new Error("Sign-in didn't return a session.");

      if (previousSession && data.user.id === previousSession.user.id) {
        throw new Error("That's already your current account.");
      }

      const { data: newProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", data.user.id)
        .single();
      if (profileError || !newProfile) throw new Error("Couldn't load that account's profile.");

      saveAccount({
        user_id: newProfile.id,
        username: newProfile.username,
        display_name: newProfile.display_name,
        avatar_url: newProfile.avatar_url,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      // Best-effort — the switcher still works on this device even if
      // this fails, it just won't show up as a hint on some other device.
      if (previousSession) {
        await supabase.rpc("link_accounts", { p_other_user_id: previousSession.user.id });
      }

      return newProfile;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
