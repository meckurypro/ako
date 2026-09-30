import { useCallback, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { ensurePermission } from "@/lib/permissions";
import { getNotifications, supportsNativeNotifications } from "@/lib/notifications-runtime";
import { supabase } from "@/lib/supabase";

const OPTED_OUT_KEY = "ako-notifications-opted-out";

export async function isNotificationsOptedOut(): Promise<boolean> {
  return (await SecureStore.getItemAsync(OPTED_OUT_KEY)) === "true";
}

async function setOptedOut(value: boolean, userId: string | undefined) {
  await SecureStore.setItemAsync(OPTED_OUT_KEY, String(value));
  if (value && userId) {
    try { await supabase.from("push_tokens").delete().eq("user_id", userId); } catch { }
  }
}

export function useNotificationSettings(userId: string | undefined) {
  const [enabled, setEnabledState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const optedOut = await isNotificationsOptedOut();
      const Notifications = await getNotifications();
      const current = Notifications ? await Notifications.getPermissionsAsync() : { granted: false };
      if (!alive) return;
      setEnabledState(current.granted && !optedOut);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const setEnabled = useCallback(async (value: boolean) => {
    if (!value) {
      setEnabledState(false);
      await setOptedOut(true, userId);
      return;
    }
    if (!supportsNativeNotifications()) {
      setEnabledState(false);
      return;
    }
    const granted = await ensurePermission("notifications");
    if (granted) await setOptedOut(false, userId);
    setEnabledState(granted);
  }, [userId]);

  return { enabled, loading, setEnabled };
}
