// /Users/gentlebookpro/Projekte/checkpoint/frontend/src/lib/crypto.ts
// Strikt typisierter, leichter Crypto-Wrapper ohne any.
// Verwendet WebCrypto, falls verfügbar; sonst Fallback auf js-sha256.

import { sha256 as jsSha256 } from 'js-sha256';

/** Prüft, ob WebCrypto Subtle verfügbar ist (secure context). */
function hasSubtle(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    !!globalThis.crypto &&
    !!globalThis.crypto.subtle &&
    typeof globalThis.crypto.subtle.digest === 'function'
  );
}

/** String/ArrayBuffer/Uint8Array → Uint8Array */
function toBytes(input: string | ArrayBuffer | Uint8Array): Uint8Array {
  if (typeof input === 'string') return new TextEncoder().encode(input);
  if (input instanceof Uint8Array) return input;
  // input ist ArrayBuffer
  return new Uint8Array(input);
}

/**
 * Liefert ein *echtes* ArrayBuffer-Slice der Bytes.
 * Wichtig wegen TS5-Generics: SubtleCrypto.digest akzeptiert BufferSource,
 * und hier geben wir bewusst ein ArrayBuffer (nicht ArrayBufferLike) weiter.
 */
function asTightArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const { buffer, byteOffset, byteLength } = bytes;
  // Falls der View den kompletten Buffer abbildet, können wir direkt casten
  if (byteOffset === 0 && byteLength === buffer.byteLength) {
    return buffer as ArrayBuffer;
  }
  // Sonst ein "tight" Slice erzeugen (garantiert ArrayBuffer)
  return (buffer as ArrayBuffer).slice(byteOffset, byteOffset + byteLength);
}

/** SHA-256: bevorzugt WebCrypto, sonst js-sha256 */
export async function digestSHA256(
  data: string | ArrayBuffer | Uint8Array,
): Promise<ArrayBuffer> {
  const bytes = toBytes(data);
  if (hasSubtle()) {
    const ab: ArrayBuffer = asTightArrayBuffer(bytes);
    return globalThis.crypto!.subtle!.digest('SHA-256', ab);
  }
  // js-sha256 liefert ArrayBuffer direkt (über .arrayBuffer)
  const ab = jsSha256.arrayBuffer(bytes);
  return ab as ArrayBuffer;
}

/** Kryptografisch starke Bytes (wenn verfügbar), sonst Pseudozufall (nur als Notnagel) */
export function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    globalThis.crypto.getRandomValues(out);
    return out;
  }
  // Fallback – nicht kryptografisch sicher, nur für Dev-Salz o. ä.
  for (let i = 0; i < length; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
}

/** ArrayBuffer → hex */
export function toHex(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0');
  return s;
}

/** Zufälliger HEX-String (lengthBytes * 2 Zeichen) */
export function randomHex(lengthBytes: number): string {
  const b = randomBytes(lengthBytes);
  return toHex(asTightArrayBuffer(b));
}
