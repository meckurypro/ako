import { useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Text } from "@/components/core";
import { FeedPager } from "@/components/feed/FeedPager";
import { useFeedChromeStyle } from "@/components/navigation/FeedChrome";
import { useActiveIdentity } from "@/features/compose/api";
import { usePageNotifications, usePersonalNotifications } from "@/features/notifications/api";
import { useTheme } from "@/providers/ThemeProvider";

const TABS = ["For You", "Top Discussions", "Following"];
function FeedTabs({ index, progress, onChange }: { index: number; progress: SharedValue<number>; onChange: (index: number) => void }) { const { colors } = useTheme(); const { width } = useWindowDimensions(); const tabWidth = (width - 32) / 3; const style = useAnimatedStyle(() => ({ transform: [{ translateX: progress.value * tabWidth }] })); return <View style={s.tabs}>{TABS.map((label, tab) => <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: index === tab }} accessibilityLabel={label} onPress={() => onChange(tab)} style={s.tab}><Text style={[s.tabLabel, { color: index === tab ? colors.accent : colors.textMuted }]}>{label}</Text></Pressable>)}<Animated.View style={[s.indicator, { width: tabWidth, backgroundColor: colors.accent }, style]} /></View>; }

export default function HomeScreen() {
  const [index, setIndex] = useState(0); const progress = useSharedValue(0); const { colors } = useTheme(); const router = useRouter(); const headerStyle = useFeedChromeStyle(-105);
  const identity = useActiveIdentity(); const pageId = identity.data?.mode === "page" ? identity.data.page.id : undefined; const personalNotifications = usePersonalNotifications(!pageId); const pageNotifications = usePageNotifications(pageId, !!pageId); const unread = (pageId ? pageNotifications.data : personalNotifications.data)?.filter(item => !item.read_at).length ?? 0;
  return <View style={[s.root, { backgroundColor: colors.background }]}><Animated.View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }, headerStyle]}><View style={s.top}><Pressable accessibilityLabel="Create" onPress={() => router.push("/modals/create")} style={s.icon}><MaterialCommunityIcons name="plus" size={24} color={colors.textMuted} /></Pressable><Image accessibilityLabel="AKọ" source={require("@/assets/images/home-logo-dark.png")} style={s.logo} contentFit="contain" /><Pressable accessibilityLabel="Open notifications" onPress={() => router.push("/(tabs)/notifications")} style={s.icon}><MaterialCommunityIcons name="bell-outline" size={22} color={colors.textMuted} />{unread > 0 && <View style={[s.badge, { backgroundColor: colors.danger }]}><Text style={s.badgeText}>{unread > 9 ? "9+" : unread}</Text></View>}</Pressable></View><FeedTabs index={index} progress={progress} onChange={setIndex} /></Animated.View><FeedPager index={index} onIndexChange={setIndex} progress={progress} /></View>;
}
const s = StyleSheet.create({ root: { flex: 1 }, header: { zIndex: 10, borderBottomWidth: StyleSheet.hairlineWidth }, top: { height: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }, icon: { width: 36, height: 36, alignItems: "center", justifyContent: "center" }, logo: { width: 76, height: 36 }, badge: { position: "absolute", right: -3, top: -4, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" }, badgeText: { color: "white", fontSize: 10, lineHeight: 12, fontWeight: "700" }, tabs: { height: 45, flexDirection: "row", paddingHorizontal: 16, position: "relative" }, tab: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 7 }, tabLabel: { fontSize: 14, fontWeight: "600", lineHeight: 19 }, indicator: { position: "absolute", left: 16, bottom: 0, height: 4, borderRadius: 99 } });
