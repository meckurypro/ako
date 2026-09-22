import { useEffect, useMemo } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { vibrateNotification } from "@/lib/vibration";
import { useAuth } from "@/providers/AuthProvider";
import type * as NotificationsType from "expo-notifications";

type PushData = Record<string, unknown>;
type NotificationsModule = typeof NotificationsType;

let notificationsPromise: Promise<NotificationsModule | null> | null = null;
let handlerConfigured = false;

function supportsNativePush() {
  return Platform.OS !== "web" && Constants.appOwnership !== "expo";
}

async function getNotifications() {
  if (!supportsNativePush()) return null;
  notificationsPromise ??= import("expo-notifications").then((module) => module).catch((error) => {
    console.warn("Push notifications are unavailable in this runtime", error);
    return null;
  });
  const Notifications = await notificationsPromise;
  if (Notifications && !handlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      }),
    });
    handlerConfigured = true;
  }
  return Notifications;
}

function value(data: PushData, keys: string[]) {
  for (const key of keys) {
    const raw = data[key];
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  }
  return null;
}

function projectId() {
  return Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId ?? undefined;
}

async function ensureAndroidChannel(Notifications: NotificationsModule) {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "AKọ notifications",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#58B981",
    sound: "default",
    enableVibrate: true,
  });
}

async function registerDevice(userId: string) {
  if (!supportsNativePush() || !Device.isDevice) return null;
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  await ensureAndroidChannel(Notifications);

  const current = await Notifications.getPermissionsAsync();
  const finalStatus = current.status === "granted" ? current.status : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== "granted") return null;

  const expoToken = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
  const token = expoToken.data;

  const { error } = await supabase.from("push_tokens").upsert({
    user_id: userId,
    token,
    platform: Platform.OS,
    device_name: Device.deviceName ?? null,
    app_version: Constants.expoConfig?.version ?? null,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: "token" });

  if (error) throw error;
  return token;
}

function routeFromData(data: PushData) {
  const conversationId = value(data, ["conversationId", "conversation_id", "roomId", "room_id"]);
  if (conversationId) return { pathname: "/messages/[conversationId]", params: { conversationId } } as const;

  const postId = value(data, ["postId", "post_id"]);
  if (postId) return { pathname: "/posts/[postId]", params: { postId } } as const;

  const profileUsername = value(data, ["profileUsername", "profile_username", "username"]);
  if (profileUsername) return { pathname: "/profiles/[username]", params: { username: profileUsername } } as const;

  const pageUsername = value(data, ["pageUsername", "page_username"]);
  if (pageUsername) return { pathname: "/pages/[username]", params: { username: pageUsername } } as const;

  return "/(tabs)/notifications" as const;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const notificationKeys = useMemo(() => userId ? [
    ["mobile-notifications", userId],
    ["notifications", userId],
    ["conversations", userId],
  ] : [], [userId]);

  useEffect(() => {
    if (!userId || !supportsNativePush()) return;
    let cancelled = false;
    void registerDevice(userId).catch((error) => {
      if (!cancelled) console.warn("Could not register push token", error);
    });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!supportsNativePush()) return undefined;
    let active = true;
    let received: { remove: () => void } | undefined;
    let response: { remove: () => void } | undefined;

    void getNotifications().then((Notifications) => {
      if (!active || !Notifications) return;
      received = Notifications.addNotificationReceivedListener((notification) => {
        void vibrateNotification();
        const data = notification.request.content.data as PushData;
        const type = value(data, ["type"]);
        if (type === "message" || value(data, ["conversationId", "conversation_id", "roomId", "room_id"])) {
          void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
        for (const key of notificationKeys) void queryClient.invalidateQueries({ queryKey: key });
      });

      response = Notifications.addNotificationResponseReceivedListener((event) => {
        const data = event.notification.request.content.data as PushData;
        router.push(routeFromData(data) as never);
      });
    });

    return () => {
      active = false;
      received?.remove();
      response?.remove();
    };
  }, [notificationKeys, queryClient, router]);
}
