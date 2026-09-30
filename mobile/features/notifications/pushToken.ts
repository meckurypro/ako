import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";
import { getNotifications, supportsNativeNotifications } from "@/lib/notifications-runtime";

export function getEasProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export async function saveTokenRow(token: string, userId: string): Promise<void> {
  const platform = Platform.OS === "ios" ? "ios" : "android";
  const rpc = await supabase.rpc("register_push_token", { p_token: token, p_platform: platform });
  if (!rpc.error) return;
  if (rpc.error.code !== "PGRST202") console.warn("register_push_token failed", rpc.error);
  const { error } = await supabase
    .from("push_tokens")
    .upsert({ token, user_id: userId, platform, last_seen_at: new Date().toISOString() }, { onConflict: "token" });
  if (error) console.warn("push token upsert failed (token may still belong to another account)", error);
}

export async function unregisterPushToken(timeoutMs = 3000): Promise<void> {
  if (!supportsNativeNotifications()) return;
  const projectId = getEasProjectId();
  if (!projectId) return;
  const Notifications = await getNotifications();
  if (!Notifications) return;
  const work = (async () => {
    const perms = await Notifications.getPermissionsAsync();
    if (!perms.granted) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from("push_tokens").delete().eq("token", token);
  })();
  try {
    await Promise.race([work, new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
  } catch { }
}
