// frontend/srv/lib/crypto/webcrypto.ts
// Sicherer Zugriff auf WebCrypto & Subtle – nur wenn vorhanden/erlaubt.

export function getWebCrypto(): Crypto | null {
  const g = globalThis as unknown as { crypto?: Crypto; msCrypto?: Crypto };
  if (typeof g.crypto !== 'undefined') return g.crypto!;
  if (typeof g.msCrypto !== 'undefined') return g.msCrypto!;
  return null;
}

export function getSubtle(): SubtleCrypto | null {
  const c = getWebCrypto();
  if (!c) return null;
  // In manchen Umgebungen existiert crypto, aber ohne subtle (kein Secure Context)
  return typeof c.subtle !== 'undefined' ? c.subtle : null;
}

export function getRandomValues(buf: Uint8Array): Uint8Array {
  const c = getWebCrypto();
  if (c && typeof c.getRandomValues === 'function') {
    return c.getRandomValues(buf);
  }
  // Fallback (nicht kryptografisch, aber ausreichend um ein Pseudo-Secret zu erzeugen)
  for (let i = 0; i < buf.length; i++) {
    buf[i] = Math.floor(Math.random() * 256);
  }
  return buf;
}
