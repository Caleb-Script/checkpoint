import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose';
import fs from 'node:fs/promises';

let cachedPrivateKey: CryptoKey | string | null = null;
let cachedPublicKey: CryptoKey | string | null = null;

async function getSigner() {
    const alg = process.env.JWT_ALG ?? 'HS256';
    if (alg === 'HS256') {
        const secret = process.env.JWT_SECRET ?? 'dev-secret-change';
        return { alg, key: new TextEncoder().encode(secret) };
    }
    if (alg === 'RS256') {
        if (!cachedPrivateKey) {
            const p = process.env.JWT_PRIVATE_KEY_PATH!;
            const pem = await fs.readFile(p, 'utf8');
            cachedPrivateKey = await importPKCS8(pem, 'RS256');
        }
        return { alg, key: cachedPrivateKey as CryptoKey };
    }
    throw new Error(`Unsupported JWT_ALG: ${alg}`);
}

async function getVerifier() {
    const alg = process.env.JWT_ALG ?? 'HS256';
    if (alg === 'HS256') {
        const secret = process.env.JWT_SECRET ?? 'dev-secret-change';
        return { key: new TextEncoder().encode(secret) };
    }
    if (alg === 'RS256') {
        if (!cachedPublicKey) {
            const p = process.env.JWT_PUBLIC_KEY_PATH!;
            const pem = await fs.readFile(p, 'utf8');
            cachedPublicKey = await importSPKI(pem, 'RS256');
        }
        return { key: cachedPublicKey as CryptoKey };
    }
    throw new Error(`Unsupported JWT_ALG: ${alg}`);
}

export type TicketJwtPayload = {
    sub: string;             // ticketId
    jti: string;             // unique id
    eventId: string;
    state: 'INSIDE' | 'OUTSIDE';
    seat?: { section?: string; row?: string; number?: string; note?: string } | null;
    allowReEntry: boolean;
    deviceHash?: string;
};

export async function signTicketJwt(payload: TicketJwtPayload, ttlSeconds: number): Promise<string> {
    const { alg, key } = await getSigner();
    const now = Math.floor(Date.now() / 1000);
    const issuer = process.env.JWT_ISSUER ?? 'checkpoint-ticket';
    const audience = process.env.JWT_AUDIENCE ?? 'checkpoint-scan';

    const token = await new SignJWT(payload as any)
        .setProtectedHeader({ alg })
        .setIssuedAt(now)
        .setNotBefore(now - 1)
        .setIssuer(issuer)
        .setAudience(audience)
        .setExpirationTime(now + ttlSeconds)
        .setJti(payload.jti)
        .setSubject(payload.sub)
        .sign(key as any);
    return token;
}

export async function verifyTicketJwt(token: string) {
    const { key } = await getVerifier();
    return jwtVerify(token, key);
}
