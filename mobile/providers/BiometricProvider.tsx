import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { AppState, Modal, Pressable, StyleSheet, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button, Text } from "@/components/core";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";

type BiometricValue = {
  available: boolean;
  enabled: boolean;
  loading: boolean;
  label: string;
  setEnabled: (enabled: boolean) => Promise<boolean>;
  authenticate: () => Promise<boolean>;
};

const BiometricContext = createContext<BiometricValue | null>(null);

function preferenceKey(userId: string) {
  return `ako.biometric_lock.${userId.replace(/[^A-Za-z0-9._-]/g, "_")}`;
}

function labelFor(types: LocalAuthentication.AuthenticationType[]) {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return "Face ID";
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return "Fingerprint";
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return "Iris unlock";
  return "Biometric unlock";
}

export function BiometricProvider({ children }: PropsWithChildren) {
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [label, setLabel] = useState("Biometric unlock");
  const promptInFlight = useRef(false);
  const userId = user?.id;

  const refreshAvailability = useCallback(async () => {
    const [hasHardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    setLabel(labelFor(types));
    const ready = hasHardware && enrolled;
    setAvailable(ready);
    return ready;
  }, []);

  const authenticate = useCallback(async () => {
    if (promptInFlight.current) return false;
    promptInFlight.current = true;
    setAuthenticating(true);
    try {
      const ready = await refreshAvailability();
      if (!ready) return false;
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock AKọ",
        promptSubtitle: "Confirm it is you",
        promptDescription: "Use your fingerprint, face, or device passcode to continue.",
        cancelLabel: "Cancel",
        fallbackLabel: "Use passcode",
        disableDeviceFallback: false,
        biometricsSecurityLevel: "weak",
      });
      if (result.success) {
        setLocked(false);
        return true;
      }
      return false;
    } finally {
      promptInFlight.current = false;
      setAuthenticating(false);
    }
  }, [refreshAvailability]);

  const setEnabled = useCallback(async (next: boolean) => {
    if (!userId) return false;
    if (!next) {
      await SecureStore.deleteItemAsync(preferenceKey(userId));
      setEnabledState(false);
      setLocked(false);
      return true;
    }

    const ok = await authenticate();
    if (!ok) return false;
    await SecureStore.setItemAsync(preferenceKey(userId), "1");
    setEnabledState(true);
    return true;
  }, [authenticate, userId]);

  useEffect(() => {
    let alive = true;

    void (async () => {
      await Promise.resolve();
      if (!alive) return;
      setLoading(true);
      setLocked(false);
      setEnabledState(false);
      if (!userId) {
        setLoading(false);
        return;
      }
      const ready = await refreshAvailability();
      const stored = await SecureStore.getItemAsync(preferenceKey(userId));
      if (!alive) return;
      const active = stored === "1" && ready;
      if (stored === "1" && !ready) await SecureStore.deleteItemAsync(preferenceKey(userId));
      setEnabledState(active);
      setLocked(active);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [refreshAvailability, userId]);

  useEffect(() => {
    if (!enabled || !userId) return undefined;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") setLocked(true);
      if (state === "active" && locked) void authenticate();
    });
    return () => subscription.remove();
  }, [authenticate, enabled, locked, userId]);

  useEffect(() => {
    if (enabled && locked && !authenticating) void authenticate();
  }, [authenticate, authenticating, enabled, locked]);

  const value = useMemo<BiometricValue>(() => ({ available, enabled, loading, label, setEnabled, authenticate }), [available, authenticate, enabled, label, loading, setEnabled]);

  return <BiometricContext.Provider value={value}>
    {children}
    <Modal visible={!!userId && enabled && locked} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={[s.lock, { backgroundColor: colors.background }]}>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.icon, { backgroundColor: colors.accentSoft }]}>
            <MaterialCommunityIcons name="fingerprint" size={42} color={colors.accent} />
          </View>
          <Text style={s.title}>Unlock AKọ</Text>
          <Text color="muted" align="center" style={s.copy}>Use {label.toLowerCase()} or your device passcode to continue.</Text>
          <Button label={authenticating ? "Checking…" : "Unlock"} loading={authenticating} onPress={() => void authenticate()} />
          <Pressable onPress={() => void signOut()} style={s.signOut}><Text color="muted" style={s.signOutText}>Sign out</Text></Pressable>
        </View>
      </View>
    </Modal>
  </BiometricContext.Provider>;
}

export function useBiometricLock() {
  const context = useContext(BiometricContext);
  if (!context) throw new Error("useBiometricLock must be used within BiometricProvider");
  return context;
}

const s = StyleSheet.create({
  lock: { flex: 1, alignItems: "center", justifyContent: "center", padding: 22 },
  card: { width: "100%", maxWidth: 360, borderWidth: StyleSheet.hairlineWidth, borderRadius: 26, padding: 22, alignItems: "center", gap: 14 },
  icon: { width: 78, height: 78, borderRadius: 39, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "800" },
  copy: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  signOut: { paddingHorizontal: 12, paddingVertical: 8 },
  signOutText: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
});
