// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function clearCookieOptions() {
  const secure =
    (process.env.SESSION_COOKIE_SECURE ?? "false").toLowerCase() === "true";
  const domain = process.env.SESSION_COOKIE_DOMAIN || undefined;
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    expires: new Date(0),
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get("kc_refresh_token")?.value || null;
    if (!refreshToken) {
      // Keine Session vorhanden
      const res = NextResponse.json({ ok: true });
      res.cookies.set("kc_access_token", "", clearCookieOptions());
      res.cookies.set("kc_refresh_token", "", clearCookieOptions());
      res.cookies.set("kc_expires_at", "", clearCookieOptions());
      return res;
    }

    const KC_BASE_URL = required("KC_BASE_URL").replace(/\/+$/, "");
    const KC_REALM = required("KC_REALM");
    const KC_CLIENT_ID = required("KC_CLIENT_ID");
    const KC_CLIENT_SECRET = process.env.KC_CLIENT_SECRET || null;

    const logoutUrl = `${KC_BASE_URL}/realms/${encodeURIComponent(KC_REALM)}/protocol/openid-connect/logout`;

    const body = new URLSearchParams();
    body.set("client_id", KC_CLIENT_ID);
    if (KC_CLIENT_SECRET) body.set("client_secret", KC_CLIENT_SECRET);
    body.set("refresh_token", refreshToken);

    await fetch(logoutUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }).catch((e) => {
      console.warn("Keycloak logout request failed:", e);
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set("kc_access_token", "", clearCookieOptions());
    res.cookies.set("kc_refresh_token", "", clearCookieOptions());
    res.cookies.set("kc_expires_at", "", clearCookieOptions());

    return res;
  } catch (err) {
    console.error("Logout API Fehler:", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
