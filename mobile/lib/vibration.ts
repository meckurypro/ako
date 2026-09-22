import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";

export const VIBRATION_ENABLED_KEY = "ako-vibration-enabled";

export async function isVibrationEnabled() {
  const stored = await SecureStore.getItemAsync(VIBRATION_ENABLED_KEY);
  return stored !== "false";
}

export async function setVibrationEnabled(value: boolean) {
  await SecureStore.setItemAsync(VIBRATION_ENABLED_KEY, String(value));
}

export async function vibrateSelection() {
  if (await isVibrationEnabled()) await Haptics.selectionAsync();
}

export async function vibrateImpact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (await isVibrationEnabled()) await Haptics.impactAsync(style);
}

export async function vibrateNotification(type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) {
  if (await isVibrationEnabled()) await Haptics.notificationAsync(type);
}
