// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/proxy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/proxy
 * Body:
 * {
 *   url: string,        // Ziel-URL (z. B. http://localhost:5001/graphql)
 *   method?: "GET"|"POST"|"PUT"|"DELETE",
 *   headers?: Record<string, string>,
 *   body?: any
 * }
 */
export async function POST(req: NextRequest) {
    const { url, method = "POST", headers: hdr = {}, body } = await req.json();

    if (!url || typeof url !== "string") {
        return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const accessCookieName = process.env.NEXT_PUBLIC_ACCESS_COOKIE_NAME || "kc_access_token";
    const access = cookies().get(accessCookieName)?.value;

    const upstreamHeaders: Record<string, string> = {
        ...hdr,
        "Content-Type": hdr["Content-Type"] || "application/json",
    };

    // Access-Token NUR serverseitig anfügen
    if (access) upstreamHeaders["Authorization"] = `Bearer ${access}`;

    const res = await fetch(url, {
        method,
        headers: upstreamHeaders,
        body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
        cache: "no-store",
    });

    // 401? Versuche einmal Refresh über den Auth-Service und Retry
    if (res.status === 401) {
        const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
        // Refresh triggert Set-Cookie via Auth-Service, aber wir müssen die Antwort an den Client weitergeben.
        const refreshRes = await fetch(`${BACKEND}/auth/refresh`, {
            method: "POST",
            headers: { Cookie: cookies().getAll().map(c => `${c.name}=${encodeURIComponent(c.value)}`).join("; ") },
            cache: "no-store",
        });

        if (refreshRes.ok) {
            const retry = await fetch(url, {
                method,
                headers: upstreamHeaders,
                body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
                cache: "no-store",
            });
            return new NextResponse(retry.body, { status: retry.status, headers: retry.headers });
        }
    }

    // Standard-Fall: Response 1:1 weiterreichen
    return new NextResponse(res.body, { status: res.status, headers: res.headers });
}
