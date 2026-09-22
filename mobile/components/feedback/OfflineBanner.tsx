import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "@/components/core";
import { useNetworkStatus } from "@/lib/offline";
import { useTheme } from "@/providers/ThemeProvider";

export function OfflineBanner() {
  const online = useNetworkStatus();
  const { colors } = useTheme();
  if (online) return null;
  return <View pointerEvents="none" style={[s.root, { backgroundColor: colors.warning }]}><MaterialCommunityIcons name="wifi-off" size={15} color="#07130D" /><Text style={s.text}>No network. You can keep using saved data; changes will sync later.</Text></View>;
}

const s = StyleSheet.create({
  root: { position: "absolute", left: 12, right: 12, bottom: 12, zIndex: 1000, elevation: 1000, minHeight: 34, borderRadius: 999, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  text: { color: "#07130D", fontSize: 12, lineHeight: 16, fontWeight: "700", textAlign: "center" },
});
