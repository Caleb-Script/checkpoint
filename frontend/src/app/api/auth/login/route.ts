// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LoginResponse = {
    data?: {
        login?: {
            access_token: string;
            refresh_token: string;
            expires_in: number;
            refresh_expires_in: number;
            id_token?: string;
            scope?: string;
            roles?: string[];
        };
    };
    errors?: any;
};

function cookieOpts(maxAgeSec?: number) {
    const secure = process.env.COOKIE_SECURE === "true";
    const domain = process.env.COOKIE_DOMAIN || undefined;
    const base = {
        httpOnly: true as const,
        sameSite: "lax" as const,
        secure,
        path: "/",
        domain,
    };
    if (typeof maxAgeSec === "number") return { ...base, maxAge: maxAgeSec };
    return base;
}

export async function POST(req: NextRequest) {
    const { username, password } = await req.json().catch(() => ({}));
    if (!username || !password) {
        return NextResponse.json({ ok: false, error: "MISSING_CREDENTIALS" }, { status: 400 });
    }

    const endpoint = process.env.NEXT_PUBLIC_BACKEND_GRAPHQL_URL!;
    const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // GraphQL-Mutation direkt als String – unabhängig von Apollo im Frontend
        body: JSON.stringify({
            query: `
        mutation Login($username: String!, $password: String!) {
          login(username: $username, password: $password) {
            access_token
            refresh_token
            expires_in
            refresh_expires_in
          }
        }
      `,
            variables: { username, password },
        }),
        cache: "no-store",
    });

    const json = (await res.json()) as LoginResponse;

    if (!res.ok || json.errors || !json.data?.login) {
        return NextResponse.json({ ok: false, error: "INVALID_LOGIN" }, { status: 401 });
    }

    const { access_token, refresh_token, expires_in, refresh_expires_in } = json.data.login;

    const accessName = process.env.NEXT_PUBLIC_ACCESS_COOKIE_NAME || "kc_access_token";
    const refreshName = process.env.NEXT_PUBLIC_REFRESH_COOKIE_NAME || "kc_refresh_token";

    const response = NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
    response.cookies.set(accessName, access_token, cookieOpts(expires_in));
    response.cookies.set(refreshName, refresh_token, cookieOpts(refresh_expires_in));
    return response;
}
