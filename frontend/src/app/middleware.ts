// /Users/gentlebookpro/Projekte/checkpoint/web/src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_COOKIE = process.env.NEXT_PUBLIC_ACCESS_COOKIE_NAME || "kc_access_token";
const PROTECTED_PREFIXES = ["/api", "/dashboard", "/invitations", "/scan", "/my-qr"];

export function middleware(req: NextRequest) {
    const { pathname, search } = req.nextUrl;

    const needsAuth = PROTECTED_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
    );

    if (!needsAuth || pathname.startsWith("/login") || pathname.startsWith("/_next") || pathname.startsWith("/api"))
        return NextResponse.next();

    const hasAccess = req.cookies.get(ACCESS_COOKIE)?.value;
    if (hasAccess) return NextResponse.next();

    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?returnTo=${encodeURIComponent(pathname + (search || ""))}`;
    return NextResponse.redirect(url);
}

export const config = {
    matcher: ["/((?!_next|favicon.ico|robots.txt|sitemap.xml|assets/|public/).*)"],
};
