import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useRouter } from "expo-router";
import type { NotificationResponse } from "expo-notifications";
import { File, Paths } from "expo-file-system";
import { ensureNotificationChannels } from "@/lib/notification-channels";
import { getNotifications, supportsNativeNotifications } from "@/lib/notifications-runtime";
import { ensurePermission } from "@/lib/permissions";
import { useAuth } from "@/providers/AuthProvider";
import { isNotificationsOptedOut } from "./settings";
import { getEasProjectId, saveTokenRow } from "./pushToken";

let handlerConfigured = false;

async function getConfiguredNotifications() {
  const Notifications = await getNotifications();
  if (Notifications && !handlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
    handlerConfigured = true;
  }
  return Notifications;
}

const PROMPTED_MARKER = new File(Paths.document, "push-permission-prompted");
const handledResponses = new Set<string>();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function markPrompted() { try { PROMPTED_MARKER.create({ overwrite: true }); } catch { } }

async function registerToken(userId: string, allowPrompt: boolean) {
  if (Platform.OS === "web" || !supportsNativeNotifications()) return;
  if (await isNotificationsOptedOut()) return;
  try {
    const Notifications = await getConfiguredNotifications();
    if (!Notifications) return;
    await ensureNotificationChannels();
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && allowPrompt && current.canAskAgain && !PROMPTED_MARKER.exists) {
      markPrompted();
      granted = await ensurePermission("notifications", { promptSettingsIfBlocked: false });
    }
    if (!granted) return;
    const projectId = getEasProjectId();
    if (!projectId) { console.warn("registerToken: no EAS projectId in app config, skipping"); return; }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await saveTokenRow(token, userId);
  } catch (error) {
    console.warn("push token registration skipped", error);
  }
}

export function usePushRegistration() {
  const { user, onboardingComplete } = useAuth();
  const router = useRouter();
  const userId = user?.id;

  useEffect(() => {
    if (!userId || !supportsNativeNotifications()) return;
    void registerToken(userId, onboardingComplete);
    const sub = AppState.addEventListener("change", (state) => { if (state === "active") void registerToken(userId, onboardingComplete); });
    return () => sub.remove();
  }, [userId, onboardingComplete]);

  const handledColdStart = useRef(false);
  useEffect(() => {
    if (!userId || handledColdStart.current || !supportsNativeNotifications()) return;
    handledColdStart.current = true;
    void getConfiguredNotifications().then((Notifications) => {
      if (!Notifications) return;
      if (openConversationFromResponse(router, Notifications.getLastNotificationResponse())) Notifications.clearLastNotificationResponse();
    });
  }, [userId, router]);

  useEffect(() => {
    if (!userId || !supportsNativeNotifications()) return undefined;
    let sub: { remove: () => void } | undefined;
    let active = true;
    void getConfiguredNotifications().then((Notifications) => {
      if (!active || !Notifications) return;
      sub = Notifications.addNotificationResponseReceivedListener((response) => openConversationFromResponse(router, response));
    });
    return () => { active = false; sub?.remove(); };
  }, [userId, router]);
}

function openConversationFromResponse(router: ReturnType<typeof useRouter>, response: NotificationResponse | null | undefined): boolean {
  if (!response) return false;
  const id = response.notification.request.identifier;
  if (handledResponses.has(id)) return false;
  const data = response.notification.request.content.data as { conversationId?: string } | undefined;
  if (typeof data?.conversationId !== "string" || !UUID_PATTERN.test(data.conversationId)) return false;
  handledResponses.add(id);
  router.push({ pathname: "/messages/[conversationId]", params: { conversationId: data.conversationId } });
  return true;
}
