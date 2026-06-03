"use client";

// Image store backed by IndexedDB.
//
// localStorage has a ~5–10 MB per-origin cap. A single saved project that
// embeds a few JPEGs as data: URLs (each base64-inflated by ~33 %) blows
// past that immediately, which is why save used to silently strip images
// and warn "Project saved without embedded images". IndexedDB's quota is
// orders of magnitude larger (typically 50 % of free disk / many GB), so
// we externalize every data: URL into IDB on save and replace it with a
// short "idb:<key>" reference. On load we look the key up and hand the
// editor a fresh blob: object URL.
//
// Public API:
//   externalizeImage(dataUrl?) -> "idb:<key>" | original | undefined
//   hydrateImage("idb:<key>") -> "blob:..." | undefined
//   deleteImage("idb:<key>") -> void
//
// All exports are async — the editor's storage layer awaits them.

const DB_NAME = "carousel-maker:images";
const STORE = "blobs";
const DB_VERSION = 1;
export const IDB_PREFIX = "idb:";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB not available"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

async function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  const meta = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  const mime = /data:([^;]+)/.exec(meta)?.[1] ?? "image/jpeg";
  const isB64 = /;base64/i.test(meta);
  const raw = isB64 ? atob(payload) : decodeURIComponent(payload);
  const u8 = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

// SHA-256 of the data URL gives us a stable content-derived key, so the same
// image stored from two places dedupes into a single IDB record.
async function hashKey(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// Cache of created object URLs by IDB key so hydrating the same blob twice
// returns the same URL (and we don't leak object URLs every save/load).
const objectUrlCache = new Map<string, string>();

export function isIdbRef(s?: string): boolean {
  return typeof s === "string" && s.startsWith(IDB_PREFIX);
}

export function isDataUrl(s?: string): boolean {
  return typeof s === "string" && s.startsWith("data:");
}

// Put a data URL into IDB and return a short "idb:<key>" reference. If the
// input isn't a data URL (e.g. a regular https:// URL or already idb:...),
// it's returned untouched.
export async function externalizeImage(
  url: string | undefined
): Promise<string | undefined> {
  if (!url) return url;
  if (!isDataUrl(url)) return url;
  try {
    const blob = dataUrlToBlob(url);
    const key = await hashKey(url);
    await tx("readwrite", (s) => s.put(blob, key));
    return IDB_PREFIX + key;
  } catch {
    // IDB unavailable (private mode, quota, etc.) — return the original
    // data URL so the existing localStorage fallback path can still try.
    return url;
  }
}

// Read a previously externalized image back out as a blob: object URL.
// Returns undefined if the key isn't in IDB (e.g. user cleared site data).
export async function hydrateImage(
  url: string | undefined
): Promise<string | undefined> {
  if (!url) return url;
  if (!isIdbRef(url)) return url;
  const key = url.slice(IDB_PREFIX.length);
  const cached = objectUrlCache.get(key);
  if (cached) return cached;
  try {
    const blob = (await tx("readonly", (s) => s.get(key))) as Blob | undefined;
    if (!blob) return undefined;
    const objUrl = URL.createObjectURL(blob);
    objectUrlCache.set(key, objUrl);
    return objUrl;
  } catch {
    return undefined;
  }
}

export async function deleteImage(url: string | undefined): Promise<void> {
  if (!url || !isIdbRef(url)) return;
  const key = url.slice(IDB_PREFIX.length);
  const cached = objectUrlCache.get(key);
  if (cached) {
    URL.revokeObjectURL(cached);
    objectUrlCache.delete(key);
  }
  try {
    await tx("readwrite", (s) => s.delete(key));
  } catch {}
}
