import { Platform } from "react-native";
import { getNotifications } from "@/lib/notifications-runtime";

export const CHANNEL_IDS = { default: "default", messages: "messages", activity: "activity" } as const;

let ensured: Promise<void> | null = null;

export function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== "android") return Promise.resolve();
  ensured ??= (async () => {
    const Notifications = await getNotifications();
    if (!Notifications) return;
    const { AndroidImportance } = Notifications;
    await Promise.all([
      Notifications.setNotificationChannelAsync(CHANNEL_IDS.default, {
        name: "Default",
        importance: AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
      }),
      Notifications.setNotificationChannelAsync(CHANNEL_IDS.messages, {
        name: "Messages",
        description: "New chat messages",
        importance: AndroidImportance.HIGH,
        sound: "ako_message.wav",
        vibrationPattern: [0, 200, 120, 200],
        enableVibrate: true,
      }),
      Notifications.setNotificationChannelAsync(CHANNEL_IDS.activity, {
        name: "Activity",
        description: "Follows, comments, gifts and other activity",
        importance: AndroidImportance.DEFAULT,
        sound: "ako_activity.wav",
        vibrationPattern: [0, 180],
        enableVibrate: true,
      }),
    ]);
  })().catch((error) => {
    ensured = null;
    throw error;
  });
  return ensured;
}
