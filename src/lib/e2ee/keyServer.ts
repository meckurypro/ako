// src/lib/e2ee/keyServer.ts
//
// OlmMachine talks in terms of Matrix's /keys/upload and /keys/query
// HTTP API shapes (see AKO_E2EE_PRE_IMPLEMENTATION_AUDIT.md §5 — this
// is the Matrix-protocol-shaped surface that comes with using
// vodozemac's OlmMachine as a standalone crypto core rather than a
// full Matrix client). This module is the translation layer: instead
// of sending these requests to a Matrix homeserver, it reads/writes
// our own e2ee_device_identity / e2ee_one_time_keys / e2ee_fallback_keys
// tables and hands OlmMachine a synthesized response shaped like what
// a real homeserver would have returned.
//
// Only handles KeysUpload and KeysQuery — the identity/prekey
// bootstrap. KeysClaim (claiming another device's prekey to start a
// session) and ToDevice (sending the actual encrypted session-setup
// message) are the next phase's concern, once session establishment
// is being built.

import type { OlmMachine } from "@matrix-org/matrix-sdk-crypto-wasm";
import { KeysUploadRequest, KeysQueryRequest, RequestType } from "@matrix-org/matrix-sdk-crypto-wasm";
import { supabase } from "../supabase";

interface MatrixDeviceKeys {
  user_id: string;
  device_id: string;
  algorithms: string[];
  keys: Record<string, string>;
  signatures: Record<string, Record<string, string>>;
}

interface MatrixSignedKey {
  key: string;
  signatures: Record<string, Record<string, string>>;
}

/** Pulls every outgoing request off `machine`, satisfies the ones this
 *  module knows how to handle against our own tables, and marks them
 *  sent so OlmMachine doesn't keep re-queuing them. Anything it
 *  doesn't yet handle (KeysClaim/ToDevice — session establishment) is
 *  left alone and logged, not silently dropped, so a future caller
 *  building that phase notices it via the console rather than
 *  wondering why requests seem to vanish. */
export async function processOutgoingRequests(machine: OlmMachine, akoDeviceId: string): Promise<void> {
  const requests = await machine.outgoingRequests();

  for (const request of requests) {
    if (request instanceof KeysUploadRequest) {
      await handleKeysUpload(machine, request, akoDeviceId);
    } else if (request instanceof KeysQueryRequest) {
      await handleKeysQuery(machine, request);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[e2ee] unhandled outgoing request type ${request.type} (id ${request.id}) — not yet implemented`);
    }
  }
}

async function handleKeysUpload(machine: OlmMachine, request: KeysUploadRequest, akoDeviceId: string): Promise<void> {
  const body = JSON.parse(request.body) as {
    device_keys?: MatrixDeviceKeys;
    one_time_keys?: Record<string, MatrixSignedKey>;
    fallback_keys?: Record<string, MatrixSignedKey>;
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("[e2ee] cannot upload keys while signed out");

  if (body.device_keys) {
    const dk = body.device_keys;
    const curve25519 = Object.entries(dk.keys).find(([k]) => k.startsWith("curve25519:"))?.[1];
    const ed25519 = Object.entries(dk.keys).find(([k]) => k.startsWith("ed25519:"))?.[1];
    const selfSignature = dk.signatures[dk.user_id]?.[`ed25519:${dk.device_id}`];
    if (!curve25519 || !ed25519 || !selfSignature) {
      throw new Error("[e2ee] KeysUploadRequest.device_keys missing expected key/signature fields");
    }

    const { error } = await supabase.from("e2ee_device_identity").upsert(
      {
        user_id: user.id,
        device_id: akoDeviceId,
        curve25519_identity_key: curve25519,
        ed25519_identity_key: ed25519,
        device_keys_signature: selfSignature,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,device_id" }
    );
    if (error) throw error;
  }

  if (body.one_time_keys && Object.keys(body.one_time_keys).length > 0) {
    const rows = Object.entries(body.one_time_keys).map(([algKeyId, signed]) => {
      const [, keyId] = algKeyId.split(":");
      const signature = Object.values(signed.signatures)[0]
        ? Object.values(Object.values(signed.signatures)[0])[0]
        : undefined;
      if (!signature) throw new Error(`[e2ee] one-time key ${algKeyId} missing a signature`);
      return {
        user_id: user.id,
        device_id: akoDeviceId,
        key_id: keyId,
        public_key: signed.key,
        signature,
      };
    });
    const { error } = await supabase.from("e2ee_one_time_keys").insert(rows);
    if (error) throw error;
  }

  if (body.fallback_keys && Object.keys(body.fallback_keys).length > 0) {
    const [algKeyId, signed] = Object.entries(body.fallback_keys)[0];
    const [, keyId] = algKeyId.split(":");
    const signature = Object.values(signed.signatures)[0]
      ? Object.values(Object.values(signed.signatures)[0])[0]
      : undefined;
    if (!signature) throw new Error(`[e2ee] fallback key ${algKeyId} missing a signature`);
    const { error } = await supabase.from("e2ee_fallback_keys").upsert(
      {
        user_id: user.id,
        device_id: akoDeviceId,
        key_id: keyId,
        public_key: signed.key,
        signature,
      },
      { onConflict: "user_id,device_id" }
    );
    if (error) throw error;
  }

  // A real Matrix homeserver's /keys/upload response reports how many
  // one-time keys it now holds for this device — OlmMachine uses that
  // count to decide whether to generate and upload more next time.
  // Ask our own e2ee_one_time_key_count() function for the real
  // number rather than assuming the upload fully succeeded.
  const { data: remaining, error: countError } = await supabase.rpc("e2ee_one_time_key_count", {
    target_device_id: akoDeviceId,
  });
  if (countError) throw countError;

  await machine.markRequestAsSent(
    request.id,
    RequestType.KeysUpload,
    JSON.stringify({ one_time_key_counts: { signed_curve25519: remaining ?? 0 } })
  );
}

async function handleKeysQuery(machine: OlmMachine, request: KeysQueryRequest): Promise<void> {
  const body = JSON.parse(request.body) as { device_keys: Record<string, string[]> };
  const requestedMatrixUserIds = Object.keys(body.device_keys);

  const deviceKeysResponse: Record<string, Record<string, MatrixDeviceKeys>> = {};

  for (const matrixUserId of requestedMatrixUserIds) {
    const akoUserId = akoUserIdFromMatrixShaped(matrixUserId);
    if (!akoUserId) continue;

    const { data: devices, error } = await supabase
      .from("e2ee_device_identity")
      .select("device_id, curve25519_identity_key, ed25519_identity_key, device_keys_signature")
      .eq("user_id", akoUserId);
    if (error) throw error;

    if (!devices || devices.length === 0) continue;

    deviceKeysResponse[matrixUserId] = {};
    for (const device of devices) {
      deviceKeysResponse[matrixUserId][device.device_id] = {
        user_id: matrixUserId,
        device_id: device.device_id,
        algorithms: ["m.olm.v1.curve25519-aes-sha2", "m.megolm.v1.aes-sha2"],
        keys: {
          [`curve25519:${device.device_id}`]: device.curve25519_identity_key,
          [`ed25519:${device.device_id}`]: device.ed25519_identity_key,
        },
        signatures: {
          [matrixUserId]: {
            [`ed25519:${device.device_id}`]: device.device_keys_signature,
          },
        },
      };
    }
  }

  await machine.markRequestAsSent(
    request.id,
    RequestType.KeysQuery,
    JSON.stringify({ device_keys: deviceKeysResponse, failures: {} })
  );
}

/** Inverse of olmMachine.ts's matrixShapedUserId — pulls the Ako
 *  Supabase user id back out of a `@<uuid>:ako.local` string. Returns
 *  null for anything not shaped that way (there shouldn't be any,
 *  since ako.local never appears from a real Matrix federation
 *  partner — there is none — but a strict format check here is cheap
 *  and turns a malformed id into a skipped user rather than a thrown
 *  exception that aborts the whole key-query response for every other
 *  requested user in the same batch). */
function akoUserIdFromMatrixShaped(matrixUserId: string): string | null {
  const match = /^@(.+):ako\.local$/.exec(matrixUserId);
  return match ? match[1] : null;
}
