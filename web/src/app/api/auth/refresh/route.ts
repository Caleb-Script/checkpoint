// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function cookieOptions(maxAgeSeconds: number) {
  const secure =
    (process.env.SESSION_COOKIE_SECURE ?? "false").toLowerCase() === "true";
  const domain = process.env.SESSION_COOKIE_DOMAIN || undefined;
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    maxAge: maxAgeSeconds,
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get("kc_refresh_token")?.value || null;
    if (!refreshToken) {
      return NextResponse.json(
        { error: "Kein Refresh-Token" },
        { status: 401 },
      );
    }

    const KC_BASE_URL = required("KC_BASE_URL").replace(/\/+$/, "");
    const KC_REALM = required("KC_REALM");
    const KC_CLIENT_ID = required("KC_CLIENT_ID");
    const KC_CLIENT_SECRET = process.env.KC_CLIENT_SECRET || null;

    const tokenUrl = `${KC_BASE_URL}/realms/${encodeURIComponent(KC_REALM)}/protocol/openid-connect/token`;

    const body = new URLSearchParams();
    body.set("grant_type", "refresh_token");
    body.set("refresh_token", refreshToken);
    body.set("client_id", KC_CLIENT_ID);
    if (KC_CLIENT_SECRET) body.set("client_secret", KC_CLIENT_SECRET);

    const resp = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const json = await resp.json().catch(() => ({}) as any);
    if (!resp.ok) {
      const msg =
        json?.error_description || json?.error || "Refresh fehlgeschlagen";
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    const { access_token, refresh_token, expires_in, refresh_expires_in } =
      json as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        refresh_expires_in: number;
      };

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + (expires_in ?? 60);

    const res = NextResponse.json({ ok: true, expiresAt });

    res.cookies.set(
      "kc_access_token",
      access_token,
      cookieOptions(expires_in ?? 60),
    );
    res.cookies.set(
      "kc_refresh_token",
      refresh_token,
      cookieOptions(refresh_expires_in ?? 3600),
    );
    res.cookies.set(
      "kc_expires_at",
      String(expiresAt),
      cookieOptions(expires_in ?? 60),
    );

    return res;
  } catch (err) {
    console.error("Refresh API Fehler:", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
