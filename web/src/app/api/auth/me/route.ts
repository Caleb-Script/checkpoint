// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";

// ▶️ Node.js Runtime (kein Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me
 *
 * Liest kc_access_token (+ kc_expires_at) aus Cookies.
 * Versucht zuerst Keycloak `/userinfo`. Falls das (z.B. wegen Scope) 403 liefert,
 * wird auf JWT-Decode zurückgefallen, um Profil-Infos & Rollen zu extrahieren.
 *
 * Antwort:
 *  200: { authenticated: true, profile, roles, tokenExpiresAt }
 *  401: { authenticated: false, reason: "no_access_token" | "expired" }
 *  200 (Fallback JWT): { authenticated: true, profile, roles, tokenExpiresAt, source: "jwt" }
 *
 * ENV:
 *  KC_BASE_URL=http://localhost:8080            # oder https://auth.example.com
 *  KC_REALM=checkpoint
 *  KC_CLIENT_ID=checkpoint-guest                # für resource_access Rollen
 *  (optional) NEXT_PUBLIC_KC_CLIENT_ID          # Fallback für o. g.
 */

type JwtPayload = {
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  exp?: number;
  [k: string]: any;
};

function getEnv(name: string, fallback?: string) {
  const v = process.env[name];
  if (v && v.trim() !== "") return v;
  return fallback ?? "";
}

function ensureEnvOrError():
  | { baseUrl: string; realm: string; clientId: string }
  | { error: string } {
  const baseUrl = getEnv("KC_BASE_URL").replace(/\/+$/, "");
  const realm = getEnv("KC_REALM");
  const clientId = getEnv(
    "KC_CLIENT_ID",
    getEnv("NEXT_PUBLIC_KC_CLIENT_ID", "checkpoint-guest"),
  );
  if (!baseUrl) return { error: "KC_BASE_URL fehlt" };
  if (!realm) return { error: "KC_REALM fehlt" };
  return { baseUrl, realm, clientId };
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    return json as JwtPayload;
  } catch {
    return null;
  }
}

function isExpired(jwt: JwtPayload | null): boolean {
  if (!jwt || typeof jwt.exp !== "number") return false;
  const now = Math.floor(Date.now() / 1000);
  return jwt.exp <= now;
}

function extractRoles(jwt: JwtPayload | null, clientId: string): string[] {
  if (!jwt) return [];
  const realmRoles: string[] = jwt.realm_access?.roles || [];
  const clientRoles: string[] = jwt.resource_access?.[clientId]?.roles || [];
  return Array.from(new Set([...(realmRoles || []), ...(clientRoles || [])]));
}

function profileFromJwt(jwt: JwtPayload | null): Record<string, any> {
  if (!jwt) return {};
  const {
    sub,
    email,
    name,
    given_name,
    family_name,
    preferred_username,
    ...rest
  } = jwt;
  return {
    sub,
    email,
    name,
    given_name,
    family_name,
    preferred_username,
    ...rest, // ggf. weitere Claims
  };
}

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get("kc_access_token")?.value || null;
    const expiresAtRaw = req.cookies.get("kc_expires_at")?.value || null;

    if (!accessToken) {
      return NextResponse.json(
        { authenticated: false, reason: "no_access_token" },
        { status: 401 },
      );
    }

    // JWT grob prüfen (Ablauf)
    const jwtPayload = decodeJwt(accessToken);
    if (isExpired(jwtPayload)) {
      return NextResponse.json(
        { authenticated: false, reason: "expired" },
        { status: 401 },
      );
    }

    const cfg = ensureEnvOrError();
    if ("error" in cfg) {
      // Fallback: trotzdem Profil & Rollen aus JWT zurückgeben (damit UI etwas hat)
      const roles = extractRoles(jwtPayload, "checkpoint-guest");
      const profile = profileFromJwt(jwtPayload);
      const tokenExpiresAt = expiresAtRaw ? Number(expiresAtRaw) : null;
      return NextResponse.json(
        {
          authenticated: true,
          profile,
          roles,
          tokenExpiresAt,
          source: "jwt",
          warn: `Config: ${cfg.error}`,
        },
        { status: 200 },
      );
    }
    const { baseUrl, realm, clientId } = cfg;

    // 1) Versuch: /userinfo (bevorzugt, wenn Scopes korrekt sind)
    const userinfoUrl = `${baseUrl}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/userinfo`;
    const resp = await fetch(userinfoUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (resp.status === 401) {
      // Access-Token ungültig/abgelaufen → Client soll /api/auth/refresh nutzen
      return NextResponse.json(
        { authenticated: false, reason: "expired" },
        { status: 401 },
      );
    }

    if (resp.ok) {
      const profile = (await resp.json()) as Record<string, any>;
      const roles = extractRoles(jwtPayload, clientId);
      const tokenExpiresAt = expiresAtRaw ? Number(expiresAtRaw) : null;

      return NextResponse.json(
        {
          authenticated: true,
          profile,
          roles,
          tokenExpiresAt,
          source: "userinfo",
        },
        { status: 200 },
      );
    }

    // 2) Fallback bei 403/insufficient_scope (oder anderen Fehlern): Profil & Rollen aus JWT
    const text = await resp.text().catch(() => "");
    const roles = extractRoles(jwtPayload, clientId);
    const profile = profileFromJwt(jwtPayload);
    const tokenExpiresAt = expiresAtRaw ? Number(expiresAtRaw) : null;

    return NextResponse.json(
      {
        authenticated: true,
        profile,
        roles,
        tokenExpiresAt,
        source: "jwt",
        warn: `userinfo failed: ${resp.status}${text ? " " + text : ""}`,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("/api/auth/me error:", err);
    return NextResponse.json(
      { authenticated: false, error: "Serverfehler" },
      { status: 500 },
    );
  }
}
