// src/lib/e2ee/storeKey.ts
//
// The OlmMachine's IndexedDB store (private identity/session keys,
// ratchet state — the actual secrets) is itself encrypted at rest by
// the library, using a 32-byte key we provide (see
// StoreHandle.openWithKey in the library's .d.ts). This file owns
// generating and persisting *that* key.
//
// HONEST LIMITATION (belongs in the security doc per spec §117, noted
// here at the source): there is no way, through this library's API, to
// keep that 32-byte key outside same-origin JavaScript's reach. The
// key must be handed to the WASM module as a plain Uint8Array on every
// page load, so it has to be readable by our own JS to get there.
// WebCrypto's non-extractable CryptoKey mechanism — which WOULD keep a
// key out of JS reach even from same-origin code — can't be used here,
// because openWithKey's signature wants raw bytes, not a CryptoKey
// handle. Practically: this design protects against a passive database
// dump (Postgres never sees this key or the store it protects — it
// never leaves the browser) but does NOT protect against an XSS
// vulnerability in this origin, which could read the key like any
// other JS-accessible browser storage. That's the same trust boundary
// every browser-based E2EE implementation accepts (there's no browser
// API that does better for a web app with no native/hardware-backed
// keystore), but it should be stated plainly rather than implied away.
//
// Stored in IndexedDB (not localStorage) purely for consistency with
// where the crypto store itself lives — there's no meaningful
// additional protection from that choice, per the limitation above.

const DB_NAME = "ako-e2ee";
const STORE_NAME = "keys";
const KEY_RECORD_ID = "store-key";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readStoredKey(db: IDBDatabase): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(KEY_RECORD_ID);
    req.onsuccess = () => resolve((req.result as Uint8Array | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function writeStoredKey(db: IDBDatabase, key: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(key, KEY_RECORD_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Returns this browser profile's store-encryption key, generating and
 *  persisting one via crypto.getRandomValues on first call. Losing
 *  this (e.g. user clears site data) makes the existing local crypto
 *  store unrecoverable — that's expected and matches how every
 *  Signal-family client behaves; it's why session establishment must
 *  stay cheap enough to redo, not a reason to weaken this key. */
export async function getOrCreateStoreKey(): Promise<Uint8Array> {
  const db = await openDb();
  try {
    const existing = await readStoredKey(db);
    if (existing) return existing;

    const key = new Uint8Array(32);
    crypto.getRandomValues(key);
    await writeStoredKey(db, key);
    return key;
  } finally {
    db.close();
  }
}
