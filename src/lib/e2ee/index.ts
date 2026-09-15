// src/lib/e2ee/index.ts
//
// Phase 1 entry point: ensures this browser has a device identity and
// has published its public keys, nothing more. Not called from any
// UI/hook yet — see AKO_E2EE_PRE_IMPLEMENTATION_AUDIT.md §7 for why
// that's deliberate. When the next phase (session establishment) is
// ready, this is what a hook like `useEnsureE2eeIdentity()` would call
// once per app session, before any encrypted send/receive path needs
// a ready OlmMachine.

import { getOlmMachine } from "./olmMachine";
import { processOutgoingRequests } from "./keyServer";
import { getOrCreateDeviceId } from "./deviceId";

/** Creates this browser's device identity if it doesn't exist yet, and
 *  makes sure its current public keys (including topping up one-time
 *  prekeys) are published to e2ee_device_identity / e2ee_one_time_keys
 *  / e2ee_fallback_keys. Safe to call on every app load — it's a
 *  no-op beyond one outgoingRequests() check once the identity and
 *  keys are already current. */
export async function ensureE2eeIdentityPublished(akoUserId: string): Promise<void> {
  const machine = await getOlmMachine(akoUserId);
  const deviceId = getOrCreateDeviceId();
  await processOutgoingRequests(machine, deviceId);
}
