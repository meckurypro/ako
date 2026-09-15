// src/lib/e2ee/deviceId.ts
//
// A stable identifier for *this browser profile*, not this user — it's
// the "device" half of the (user, device) identity pair the crypto
// library expects (see AKO_E2EE_PRE_IMPLEMENTATION_AUDIT.md §1: device
// exists as a concept from day one even though today's app is
// single-device-per-user). It is NOT secret — it's stored alongside
// public key material in e2ee_device_identity and is meant to be
// visible to anyone the user talks to, the same way a Signal or Matrix
// "device ID" is. Do not confuse this with the store *encryption* key
// in storeKey.ts, which genuinely must stay private.

const STORAGE_KEY = "ako:e2ee:device-id";

export function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  // crypto.randomUUID() is available in every browser this app already
  // requires (Vite's target is es2023) — no polyfill needed.
  const id = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}
