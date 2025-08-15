// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/session/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionInfo = { authenticated: boolean; profile?: any };

/**
 * Liest das Access-Token (HttpOnly Cookie) und decodiert nur den Payload,
 * um minimale Profilinfos zu liefern – der Token wird NICHT an den Client gegeben.
 */
function decodeJwt(token: string) {
    try {
        const [, payload] = token.split(".");
        return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    } catch {
        return null;
    }
}

export async function GET() {
    const accessName = process.env.NEXT_PUBLIC_ACCESS_COOKIE_NAME || "kc_access_token";
    const rtName = process.env.NEXT_PUBLIC_REFRESH_COOKIE_NAME || "kc_refresh_token";
    let at = cookies().get(accessName)?.value || null;
    const rt = cookies().get(rtName)?.value || null;

    if (!at && rt) {
        // Versuch Refresh über unsere eigene Next-Route
        const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/auth/refresh`, {
            method: "POST",
            cache: "no-store",
        });
        if (refreshRes.ok) {
            at = cookies().get(accessName)?.value || null; // Achtung: innerhalb derselben Response nicht neu lesbar
        }
    }

    if (!at) return NextResponse.json<SessionInfo>({ authenticated: false }, { status: 401 });

    const payload = decodeJwt(at);
    return NextResponse.json<SessionInfo>({ authenticated: true, profile: payload }, { headers: { "Cache-Control": "no-store" } });
}
