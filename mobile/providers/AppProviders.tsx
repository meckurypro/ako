import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "@/lib/query-client";
import { restoreNativeQueryCache, startNativeQueryCachePersistence } from "@/lib/query-persistence";
import { AuthProvider } from "./AuthProvider";
import { BiometricProvider } from "./BiometricProvider";
import { ThemeProvider } from "./ThemeProvider";

function QueryPersistenceGate({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void restoreNativeQueryCache().finally(() => {
      if (!alive) return;
      startNativeQueryCachePersistence();
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return ready ? children : null;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <QueryPersistenceGate>
            <ThemeProvider><AuthProvider><BiometricProvider>{children}</BiometricProvider></AuthProvider></ThemeProvider>
          </QueryPersistenceGate>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
