// apps/web/src/lib/crypto/base64url.ts
export function toBase64Url(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  // btoa expects binary string
  const b64 =
    typeof window !== 'undefined'
      ? btoa(str)
      : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function fromBase64Url(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const binary =
    typeof window !== 'undefined'
      ? atob(b64 + pad)
      : Buffer.from(b64 + pad, 'base64').toString('binary');

  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
