// /Users/gentlebookpro/Projekte/checkpoint/web/src/lib/claim.ts
import crypto from "crypto";

const SECRET = process.env.CLAIM_SECRET || "dev-secret-change-me";

export type ClaimPayload = {
    kind: "invite-reg" | "ticket";
    invitationId: string;
    ticketId?: string;
    exp: number; // unix seconds
};

function b64url(input: Buffer | string) {
    return Buffer.from(input).toString("base64url");
}

export function signToken(payload: Omit<ClaimPayload, "exp">, ttlSeconds: number): string {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const data: ClaimPayload = { ...payload, exp };
    const raw = JSON.stringify(data);
    const b = b64url(raw);
    const sig = crypto.createHmac("sha256", SECRET).update(b).digest("base64url");
    return `${b}.${sig}`;
}

export function verifyToken(token: string): { ok: true; data: ClaimPayload } | { ok: false; error: string } {
    const [b, sig] = token.split(".");
    if (!b || !sig) return { ok: false, error: "malformed" };
    const expSig = crypto.createHmac("sha256", SECRET).update(b).digest("base64url");
    // timing-safe compare
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expSig))) return { ok: false, error: "bad-signature" };
    let data: ClaimPayload;
    try {
        data = JSON.parse(Buffer.from(b, "base64url").toString("utf8"));
    } catch {
        return { ok: false, error: "invalid-json" };
    }
    if (typeof data.exp !== "number" || Math.floor(Date.now() / 1000) > data.exp) return { ok: false, error: "expired" };
    return { ok: true, data };
}
