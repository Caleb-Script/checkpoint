import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

const ACCESS_COOKIE =
    process.env.NEXT_PUBLIC_ACCESS_COOKIE_NAME || "kc_access_token";

// Welche Pfade Login brauchen:
const PROTECTED_PREFIXES = [
    "/api",
    "/dashboard",
    "/invitations",
    "/scan",
    "/my-qr",
    "/debug",
];

// --- JWKS Caching pro Issuer ---
const jwksCache = new Map<string, ReturnType<typeof jose.createRemoteJWKSet>>();

function getJwks(issuer: string) {
    const url = new URL(`${issuer}/protocol/openid-connect/certs`);
    let jwks = jwksCache.get(url.href);
    if (!jwks) {
        jwks = jose.createRemoteJWKSet(url);
        jwksCache.set(url.href, jwks);
    }
    return jwks;
}

type RealmPayload = jose.JWTPayload & {
    realm_access?: { roles?: string[] };
    azp?: string;
};

async function verifyToken(token: string): Promise<RealmPayload | null> {
    try {
        // 1) Issuer (iss) aus dem Token nehmen → robust gg. Port/Host-Änderungen
        const decoded = jose.decodeJwt(token);
        const iss = decoded.iss;
        if (!iss) return null;

        // 2) Signatur/Issuer prüfen
        const JWKS = getJwks(iss);
        const { payload } = await jose.jwtVerify(token, JWKS, {
            issuer: iss,
            // audience absichtlich NICHT erzwungen (Keycloak setzt aud je nach Flow unterschiedlich)
        });

        // 3) Optional: erzwingen, dass der Token für DEINEN Client ausgestellt wurde
        const clientId = process.env.KEYCLOAK_CLIENT_ID;
        if (clientId && decoded.azp && decoded.azp !== clientId) {
            return null;
        }

        return payload as RealmPayload;
    } catch {
        return null;
    }
}

function hasAdminRole(payload: RealmPayload): boolean {
    const roles = payload.realm_access?.roles ?? [];
    return roles.some((r) => r?.toLowerCase() === "admin");
}

export async function middleware(req: NextRequest) {
    const { pathname, search } = req.nextUrl;

    // Öffentliche/statische Ressourcen durchlassen
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/assets") ||
        pathname.startsWith("/public") ||
        pathname === "/favicon.ico" ||
        pathname === "/robots.txt" ||
        pathname === "/sitemap.xml"
    ) {
        return NextResponse.next();
    }

    const token = req.cookies.get(ACCESS_COOKIE)?.value;

    // Bereits eingeloggt? Dann /login sperren
    if (token && pathname.startsWith("/login")) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    // Braucht Auth?
    const needsAuth = PROTECTED_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(p + "/"),
    );

    if (needsAuth) {
        // Nicht eingeloggt → auf /login (mit returnTo)
        if (!token) {
            const url = req.nextUrl.clone();
            url.pathname = "/login";
            url.search = `?returnTo=${encodeURIComponent(pathname + (search || ""))}`;
            return NextResponse.redirect(url);
        }

        // Token kryptografisch verifizieren
        const payload = await verifyToken(token);
        if (!payload) {
            const url = req.nextUrl.clone();
            url.pathname = "/login";
            return NextResponse.redirect(url);
        }

        // /debug nur für Admins
        if (pathname.startsWith("/debug") && !hasAdminRole(payload)) {
            const url = req.nextUrl.clone();
            url.pathname = "/forbidden";
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next|favicon.ico|robots.txt|sitemap.xml|assets/|public/).*)",
    ],
};
