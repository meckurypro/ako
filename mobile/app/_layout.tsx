import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Platform, View } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { configureReanimatedLogger, ReanimatedLogLevel } from "react-native-reanimated";
import { AppProviders } from "@/providers/AppProviders";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { AppSplash } from "@/components/feedback/AppSplash";

void SplashScreen.preventAutoHideAsync();
configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

const HOME_PATH = "/home";

function useAndroidBackHistory() {
  const router = useRouter();
  const pathname = usePathname();
  const history = useRef<string[]>([]);
  const current = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "android" || !pathname || pathname === current.current) return;
    if (current.current) history.current = [...history.current.filter(path => path !== pathname), current.current].slice(-30);
    current.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (router.canGoBack()) {
        router.back();
        return true;
      }

      const previous = history.current.pop();
      if (previous && previous !== current.current) {
        router.replace(previous as never);
        return true;
      }

      if (current.current !== HOME_PATH) {
        router.replace("/(tabs)/home");
        return true;
      }

      return true;
    });
    return () => subscription.remove();
  }, [router]);
}

function AppNavigator() {
  const { isReady } = useAuth(); const { colors, isDark } = useTheme(); const [showSplash, setShowSplash] = useState(true);
  useAndroidBackHistory();
  const onLayout = useCallback(() => { void SplashScreen.hideAsync(); }, []);
  return <View onLayout={onLayout} style={{ flex: 1, backgroundColor: colors.background }}><StatusBar style={isDark ? "light" : "dark"} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: "fade_from_bottom" }}><Stack.Screen name="(auth)" /><Stack.Screen name="(onboarding)" /><Stack.Screen name="(tabs)" /><Stack.Screen name="auth/callback" /><Stack.Screen name="auth/reset-password" /><Stack.Screen name="profile/edit" /><Stack.Screen name="modals/create" options={{ presentation: "transparentModal", animation: "fade", contentStyle: { backgroundColor: "transparent" } }} /><Stack.Screen name="modals/logout-confirm" options={{ presentation: "transparentModal", animation: "fade" }} /></Stack>{showSplash && <AppSplash ready={isReady} onFinished={() => setShowSplash(false)} />}</View>;
}

export default function RootLayout() { return <AppProviders><AppNavigator /></AppProviders>; }
