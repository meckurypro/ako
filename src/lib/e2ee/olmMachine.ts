// src/lib/e2ee/olmMachine.ts
//
// Owns the single OlmMachine instance for this browser tab/session.
// The machine itself persists its cryptographic state to IndexedDB
// (encrypted with the key from storeKey.ts, via StoreHandle.openWithKey
// below) across page loads — this module just handles the "get me a
// ready instance" part, including the one-time WASM init.
//
// Deliberately NOT wired into any UI or message-send path yet — see
// AKO_E2EE_PRE_IMPLEMENTATION_AUDIT.md §7. This is identity/key
// infrastructure only. Session establishment (claiming another
// device's prekey, creating a pairwise Olm session, and the actual
// encrypt/decrypt calls) is the next phase.

import { initAsync, OlmMachine, StoreHandle, UserId, DeviceId } from "@matrix-org/matrix-sdk-crypto-wasm";
import { getOrCreateDeviceId } from "./deviceId";
import { getOrCreateStoreKey } from "./storeKey";

let wasmReady: Promise<void> | null = null;
function ensureWasmInit(): Promise<void> {
  if (!wasmReady) wasmReady = initAsync();
  return wasmReady;
}

let machinePromise: Promise<OlmMachine> | null = null;

/** Returns this browser's OlmMachine for `akoUserId`, creating and
 *  persisting a new device identity on first call. Safe to call
 *  repeatedly — subsequent calls return the same cached instance
 *  without re-touching IndexedDB. akoUserId should be the Supabase
 *  auth user id (stable per account, unlike anything derived from
 *  session/JWT — see spec §7: device identity must be distinct from
 *  the auth token). */
export function getOlmMachine(akoUserId: string): Promise<OlmMachine> {
  if (!machinePromise) {
    machinePromise = (async () => {
      await ensureWasmInit();
      const deviceId = getOrCreateDeviceId();
      const storeKey = await getOrCreateStoreKey();
      // One IndexedDB store per Ako account on this browser profile —
      // named so two different Ako accounts signed into the same
      // browser (unusual, but not disallowed) don't collide.
      const storeName = `ako-e2ee-${akoUserId}`;
      const storeHandle = await StoreHandle.openWithKey(storeName, storeKey);
      return OlmMachine.initFromStore(new UserId(matrixShapedUserId(akoUserId)), new DeviceId(deviceId), storeHandle);
    })().catch((err) => {
      // Don't leave a rejected promise cached — a transient failure
      // (e.g. IndexedDB briefly unavailable) shouldn't permanently
      // wedge this module for the rest of the session.
      machinePromise = null;
      throw err;
    });
  }
  return machinePromise;
}

/** The library's UserId type expects a Matrix-shaped id
 *  (`@localpart:domain`) — it doesn't actually validate that "domain"
 *  resolves anywhere, since we're using OlmMachine as a standalone
 *  crypto core, not a real Matrix client talking to a homeserver. This
 *  just gives Ako's UUIDs that shape so the library's internal parsing
 *  doesn't choke on them. `ako.local` is not a real domain and nothing
 *  ever resolves it — it exists only inside this id string. */
function matrixShapedUserId(akoUserId: string): string {
  return `@${akoUserId}:ako.local`;
}
