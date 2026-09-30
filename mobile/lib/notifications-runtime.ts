import { Platform } from "react-native";
import Constants from "expo-constants";
import type * as NotificationsType from "expo-notifications";

export type NotificationsModule = typeof NotificationsType;

let notificationsPromise: Promise<NotificationsModule | null> | null = null;

export function supportsNativeNotifications() {
  return Platform.OS !== "web" && Constants.appOwnership !== "expo";
}

export async function getNotifications(): Promise<NotificationsModule | null> {
  if (!supportsNativeNotifications()) return null;
  notificationsPromise ??= import("expo-notifications")
    .then((module) => module)
    .catch((error) => {
      console.warn("Expo notifications are unavailable in this runtime", error);
      return null;
    });
  return notificationsPromise;
}
