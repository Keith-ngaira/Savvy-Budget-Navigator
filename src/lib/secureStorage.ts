// Minimal client-side encryption wrapper for localStorage using Web Crypto (AES-GCM)
// Passphrase is requested once per session (stored in-memory only).

let sessionKey: CryptoKey | null = null;
let sessionSalt: Uint8Array | null = null;

function textEncoder() { return new TextEncoder(); }
function textDecoder() { return new TextDecoder(); }

// Check if Web Crypto API is available (requires HTTPS or localhost)
function isCryptoAvailable(): boolean {
  return typeof window !== 'undefined' && 
         window.crypto && 
         window.crypto.subtle !== undefined;
}

async function deriveKey(passphrase: string, salt: ArrayBuffer) {
  if (!isCryptoAvailable()) {
    throw new Error('Web Crypto API not available. Use HTTPS or localhost.');
  }
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder().encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function toB64(arr: Uint8Array) { return btoa(String.fromCharCode(...arr)); }
function fromB64(b64: string) { return new Uint8Array([...atob(b64)].map(c => c.charCodeAt(0))); }

export async function ensurePassphrase(): Promise<void> {
  if (sessionKey) return;
  // Try to reuse salt from localStorage (not secret) so key derivation is consistent per device.
  const saltKey = 'sbn-secure-salt';
  let saltStr = localStorage.getItem(saltKey);
  if (!saltStr) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    localStorage.setItem(saltKey, toB64(salt));
    saltStr = localStorage.getItem(saltKey)!;
  }
  sessionSalt = fromB64(saltStr!);

  let passphrase = sessionStorage.getItem('sbn-passphrase');
  if (!passphrase) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    passphrase = toB64(bytes);
    sessionStorage.setItem('sbn-passphrase', passphrase);
  }
  sessionKey = await deriveKey(passphrase, sessionSalt!.buffer as ArrayBuffer);
}

export async function encryptJSON(obj: any): Promise<string> {
  if (!sessionKey) throw new Error('Key missing');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = textEncoder().encode(JSON.stringify(obj));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sessionKey, plaintext));
  const payload = {
    v: 1,
    iv: toB64(iv),
    ct: toB64(ciphertext)
  };
  return JSON.stringify(payload);
}

export async function decryptJSON(payload: string): Promise<any> {
  if (!sessionKey) throw new Error('Key missing');
  if (!payload) return null;
  try {
    const { iv, ct } = JSON.parse(payload);
    const ivBytes = fromB64(iv);
    const ctBytes = fromB64(ct);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, sessionKey, ctBytes);
    return JSON.parse(textDecoder().decode(new Uint8Array(plain)));
  } catch {
    // Fallback: plaintext support (migrate old data)
    try { return JSON.parse(payload); } catch { return null; }
  }
}

export async function secureGet(key: string): Promise<any> {
  // Fallback to unencrypted storage if crypto unavailable
  if (!isCryptoAvailable()) {
    console.warn('[secureStorage] Web Crypto unavailable, using unencrypted localStorage');
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }
  
  await ensurePassphrase();
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  return decryptJSON(raw);
}

export async function secureSet(key: string, value: any): Promise<void> {
  // Fallback to unencrypted storage if crypto unavailable
  if (!isCryptoAvailable()) {
    console.warn('[secureStorage] Web Crypto unavailable, using unencrypted localStorage');
    localStorage.setItem(key, JSON.stringify(value));
    return;
  }
  
  await ensurePassphrase();
  const payload = await encryptJSON(value);
  localStorage.setItem(key, payload);
}
