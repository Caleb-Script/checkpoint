import * as jose from 'jose';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ACCESS_COOKIE =
  process.env.NEXT_PUBLIC_ACCESS_COOKIE_NAME || 'kc_access_token';

// ---------------------------------------------------------------------------
// Rollen & Pfad-Regeln
// ---------------------------------------------------------------------------

type Role = 'ADMIN' | 'SECURITY' | 'GUEST';

type Rule = {
  prefix: string;
  // Wenn roles gesetzt → diese Rollen sind erlaubt
  // Wenn roles nicht gesetzt → nur eingeloggt sein reicht
  roles?: Role[];
};

// Reihenfolge: spezifische Pfade zuerst
const RULES: Rule[] = [
  // Admin-Only
  { prefix: '/admin', roles: ['ADMIN'] },
  { prefix: '/admin/event', roles: ['ADMIN'] },
  { prefix: '/admin/invitations', roles: ['ADMIN'] },
  { prefix: '/admin/tickets', roles: ['ADMIN'] },

  // Security & Admin
  { prefix: '/security', roles: ['ADMIN', 'SECURITY'] },
  { prefix: '/scan', roles: ['ADMIN', 'SECURITY'] },

  // Auth: alle Rollen
  { prefix: '/my-qr' }, // authentifiziert, Rolle egal
  { prefix: '/api' }, // authentifiziert, Rolle egal

  // Debug bleibt unten zusätzlich hart geprüft (ADMIN-only)
  { prefix: '/debug', roles: ['ADMIN'] },

  // ggf. weitere Bereiche:
  // { prefix: '/dashboard' }, // authentifiziert, Rolle egal (falls genutzt)
];

// ---------------------------------------------------------------------------
// JWKS Caching pro Issuer
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Token-Validierung & Rollen-Ermittlung
// ---------------------------------------------------------------------------

type RealmPayload = jose.JWTPayload & {
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  azp?: string; // authorized party (Client)
  iss?: string;
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

function normalizeRole(r?: string): Role | null {
  if (!r) return null;
  const up = r.toUpperCase();
  if (up === 'ADMIN') return 'ADMIN';
  if (up === 'SECURITY') return 'SECURITY';
  if (up === 'GUEST') return 'GUEST';
  return null;
}

function extractRoles(payload: RealmPayload): Role[] {
  const out = new Set<Role>();

  // Realm-Rollen
  const realmRoles = payload.realm_access?.roles ?? [];
  for (const r of realmRoles) {
    const nr = normalizeRole(r);
    if (nr) out.add(nr);
  }

  // Client-/Ressource-Rollen (z. B. Keycloak: resource_access[clientId].roles)
  const clientRolesGroups = payload.resource_access ?? {};
  for (const group of Object.values(clientRolesGroups)) {
    const roles = group?.roles ?? [];
    for (const r of roles) {
      const nr = normalizeRole(r);
      if (nr) out.add(nr);
    }
  }

  // Falls keine definierte Rolle im Token → implizit „GUEST“, wenn eingeloggt
  if (out.size === 0) out.add('GUEST');
  return Array.from(out);
}

function isProtectedPath(pathname: string): Rule | null {
  // statische/öffentliche Ressourcen: nie schützen
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/public') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return null;
  }
  // passende Regel finden
  for (const rule of RULES) {
    if (pathname === rule.prefix || pathname.startsWith(rule.prefix + '/')) {
      return rule;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Bereits eingeloggt? → /login sperren
  const token = req.cookies.get(ACCESS_COOKIE)?.value ?? null;
  if (token && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Nicht-geschützte Pfade durchlassen
  const matchedRule = isProtectedPath(pathname);
  if (!matchedRule) {
    return NextResponse.next();
  }

  // Ab hier: auth erforderlich
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?returnTo=${encodeURIComponent(pathname + (search || ''))}`;
    return NextResponse.redirect(url);
  }

  // Token prüfen
  const payload = await verifyToken(token);
  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?returnTo=${encodeURIComponent(pathname + (search || ''))}`;
    return NextResponse.redirect(url);
  }

  // Rollen ermitteln
  const roles = extractRoles(payload);

  // „/debug“ redundant absichern (ADMIN-only)
  if (pathname.startsWith('/debug') && !roles.includes('ADMIN')) {
    const url = req.nextUrl.clone();
    url.pathname = '/forbidden';
    return NextResponse.redirect(url);
  }

  // Rollen-Regel prüfen (falls die Regel Rollen verlangt)
  if (matchedRule.roles && matchedRule.roles.length > 0) {
    const allowed = matchedRule.roles.some((r) => roles.includes(r));
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = '/forbidden';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// ---------------------------------------------------------------------------
// Matcher
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|robots.txt|sitemap.xml|assets/|public/).*)',
  ],
};
