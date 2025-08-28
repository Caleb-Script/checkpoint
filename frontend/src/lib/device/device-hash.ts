// apps/web/src/lib/device/device-hash.ts
import { toBase64Url } from '../crypto/base64url';
import { sha256 as sha256Fallback } from '../crypto/sha256';
import { getRandomValues, getSubtle } from '../crypto/webcrypto';
import { getDeviceSecretStore } from './device-secret.store';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function generateSecret(): string {
  const arr = new Uint8Array(32);
  getRandomValues(arr); // WebCrypto oder PRNG-Fallback
  return toBase64Url(arr);
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const subtle = getSubtle();
  if (subtle) {
    const digest = await subtle.digest('SHA-256', data);
    return new Uint8Array(digest);
  }
  return sha256Fallback(data);
}

/** Holt (oder erzeugt) das persistente Geräte-Secret – auf iOS in der Keychain. */
export async function getOrCreateDeviceSecret(): Promise<string> {
  const store = await getDeviceSecretStore();
  const existing = await store.get();
  if (existing && existing.length > 0) return existing;

  const secret = generateSecret();
  await store.set(secret);
  return secret;
}

/** Liefert den Base64URL-SHA256(deviceSecret) als deviceHash. */
export async function getDeviceHash(): Promise<string> {
  if (!isBrowser()) {
    // Auch in Capacitor gibt es ein DOM (WKWebView). Nur im SSR/Node nicht.
    throw new Error('getDeviceHash must run in a browser/webview context');
  }
  const secret = await getOrCreateDeviceSecret();
  const enc = new TextEncoder();
  const digest = await sha256(enc.encode(secret));
  return toBase64Url(digest);
}

/** Rotiert das Geräte-Secret (führt zu neuem deviceHash). */
export async function rotateDeviceSecret(): Promise<void> {
  const store = await getDeviceSecretStore();
  await store.remove();
  const fresh = generateSecret();
  await store.set(fresh);
}
