import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { Platform } from "react-native";
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
  const { session, isReady, onboardingComplete } = useAuth(); const { colors } = useTheme();
  if (!isReady) return null; if (!session) return <Redirect href="/(auth)" />; if (!onboardingComplete) return <Redirect href="/(onboarding)" />;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.textMuted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: Platform.OS === "ios" ? 84 : 66, paddingTop: 7 }, tabBarLabelStyle: { fontSize: 11, fontWeight: "600" } }}>
    <Tabs.Screen name="home" options={{ title: "Feed", tabBarIcon: tabIcon("home", "home-outline") }} />
    <Tabs.Screen name="discover" options={{ title: "Discover", tabBarIcon: tabIcon("compass", "compass-outline") }} />
    <Tabs.Screen name="create" options={{ title: "Library", tabBarIcon: tabIcon("bookshelf", "bookshelf") }} />
    <Tabs.Screen name="inbox" options={{ title: "Messages", tabBarIcon: tabIcon("message", "message-outline") }} />
    <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("account-circle", "account-circle-outline") }} />
    <Tabs.Screen name="notifications" options={{ href: null }} />
  </Tabs>;
}
