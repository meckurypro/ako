import AsyncStorage from "@react-native-async-storage/async-storage";
import { dehydrate, hydrate, type DehydratedState, type Query } from "@tanstack/react-query";
import { queryClient } from "./query-client";

const CACHE_KEY = "ako.native.query-cache.v1";
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;
const PERSIST_DEBOUNCE = 1200;

const STATIC_QUERY_KEYS = new Set([
  "bank-list",
  "categories-with-interests",
  "exchange-rates",
  "feature-flags",
  "gift-types",
  "gig-roles",
  "onboarding-recommendations",
  "payout-settings",
]);

type PersistedCache = {
  timestamp: number;
  state: DehydratedState;
};

let restored = false;
let unsubscribe: (() => void) | undefined;
let timeout: ReturnType<typeof setTimeout> | undefined;

function canPersist(query: Query) {
  const [scope] = query.queryKey;
  return typeof scope === "string" && STATIC_QUERY_KEYS.has(scope) && query.state.status === "success";
}

async function persist() {
  const state = dehydrate(queryClient, { shouldDehydrateQuery: canPersist });
  if (!state.queries.length) return;
  const payload: PersistedCache = { timestamp: Date.now(), state };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

function schedulePersist() {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    timeout = undefined;
    void persist().catch(() => undefined);
  }, PERSIST_DEBOUNCE);
}

export async function restoreNativeQueryCache() {
  if (restored) return;
  restored = true;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const payload = JSON.parse(raw) as PersistedCache;
    if (!payload.timestamp || Date.now() - payload.timestamp > CACHE_MAX_AGE) {
      await AsyncStorage.removeItem(CACHE_KEY);
      return;
    }
    hydrate(queryClient, payload.state);
  } catch {
    await AsyncStorage.removeItem(CACHE_KEY).catch(() => undefined);
  }
}

export function startNativeQueryCachePersistence() {
  if (unsubscribe) return unsubscribe;
  unsubscribe = queryClient.getQueryCache().subscribe(schedulePersist);
  return unsubscribe;
}
