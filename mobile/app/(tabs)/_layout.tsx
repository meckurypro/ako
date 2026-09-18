import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { FeedChromeProvider, useFeedChromeStyle } from "@/components/navigation/FeedChrome";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
const tabIcon = (active: IconName, inactive: IconName) => function TabBarIcon({ color, focused }: { color: unknown; focused: boolean }) { return <MaterialCommunityIcons name={focused ? active : inactive} size={24} color={String(color)} />; };

function AutoHideTabBar({ state, descriptors, navigation }: any) { const { colors } = useTheme(); const insets = useSafeAreaInsets(); const style = useFeedChromeStyle(96); return <Animated.View style={[s.bar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) }, style]}><View style={s.items}>{state.routes.map((route: any, index: number) => { const focused = state.index === index; const options = descriptors[route.key].options; const color = focused ? colors.accent : colors.textMuted; const icon = options.tabBarIcon?.({ focused, color, size: 24 }); const label = options.title ?? route.name; return <Pressable key={route.key} accessibilityRole="button" accessibilityState={{ selected: focused }} onPress={() => navigation.navigate(route.name)} style={s.item}>{icon}<Animated.Text style={[s.label, { color }]}>{label}</Animated.Text></Pressable>; })}</View></Animated.View>; }

export default function TabsLayout() {
  const { session, isReady, onboardingComplete } = useAuth();
  if (!isReady) return null; if (!session) return <Redirect href="/(auth)" />; if (!onboardingComplete) return <Redirect href="/(onboarding)" />;
  return <FeedChromeProvider><Tabs tabBar={props => <AutoHideTabBar {...props} />} screenOptions={{ headerShown: false }}><Tabs.Screen name="home" options={{ title: "Feed", tabBarIcon: tabIcon("home-variant", "home-variant-outline") }} /><Tabs.Screen name="discover" options={{ title: "Discover", tabBarIcon: tabIcon("magnify", "magnify") }} /><Tabs.Screen name="create" options={{ title: "Library", tabBarIcon: tabIcon("bookshelf", "bookshelf") }} /><Tabs.Screen name="inbox" options={{ title: "Messages", tabBarIcon: tabIcon("message", "message-outline") }} /><Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("account", "account-outline") }} /><Tabs.Screen name="notifications" options={{ href: null }} /></Tabs></FeedChromeProvider>;
}

const s = StyleSheet.create({ bar: { zIndex: 20, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 7 }, items: { height: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-around" }, item: { width: 64, alignItems: "center", justifyContent: "center", gap: 2 }, label: { fontSize: 11, fontWeight: "600" } });
