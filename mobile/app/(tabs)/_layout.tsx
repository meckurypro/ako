import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, Tabs, useRouter } from "expo-router";
import { Platform, Pressable, View } from "react-native";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
const tabIcon = (active: IconName, inactive: IconName) => {
  function TabBarIcon({ color, focused }: { color: unknown; focused: boolean }) {
    return <MaterialCommunityIcons name={focused ? active : inactive} size={24} color={String(color)} />;
  }
  return TabBarIcon;
};

export default function TabsLayout() {
  const { session, isReady, onboardingComplete } = useAuth(); const { colors } = useTheme(); const router = useRouter();
  if (!isReady) return null; if (!session) return <Redirect href="/(auth)" />; if (!onboardingComplete) return <Redirect href="/(onboarding)" />;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.textMuted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: Platform.OS === "ios" ? 84 : 66, paddingTop: 7 }, tabBarLabelStyle: { fontSize: 11, fontWeight: "600" } }}>
    <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: tabIcon("home", "home-outline") }} />
    <Tabs.Screen name="discover" options={{ title: "Discover", tabBarIcon: tabIcon("compass", "compass-outline") }} />
    <Tabs.Screen name="create" options={{ title: "Create", tabBarIcon: () => null, tabBarButton: () => <View style={{ flex: 1, alignItems: "center" }}><Pressable accessibilityRole="button" accessibilityLabel="Create" onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/modals/create"); }} style={({ pressed }) => ({ marginTop: -18, width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent, borderWidth: 4, borderColor: colors.surface, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}><MaterialCommunityIcons name="plus" size={28} color={colors.onAccent} /></Pressable></View> }} />
    <Tabs.Screen name="inbox" options={{ title: "Inbox", tabBarIcon: tabIcon("message", "message-outline") }} />
    <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("account-circle", "account-circle-outline") }} />
  </Tabs>;
}
