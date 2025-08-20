// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/auth/diag/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getEnv(name: string) {
  const v = process.env[name];
  return v && v.trim() !== "" ? v : null;
}

export async function GET(req: NextRequest) {
  try {
    const baseUrl = (getEnv("KC_BASE_URL") || "").replace(/\/+$/, "");
    const realm = getEnv("KC_REALM");
    const clientId =
      getEnv("KC_CLIENT_ID") ||
      getEnv("NEXT_PUBLIC_KC_CLIENT_ID") ||
      "checkpoint-guest";

    const accessToken = req.cookies.get("kc_access_token")?.value || null;
    const refreshToken = req.cookies.get("kc_refresh_token")?.value || null;

    const envOk = !!baseUrl && !!realm;
    const openIdConfigUrl = envOk
      ? `${baseUrl}/realms/${encodeURIComponent(realm)}/.well-known/openid-configuration`
      : null;

    const results: any = {
      env: {
        KC_BASE_URL: baseUrl || "(leer)",
        KC_REALM: realm || "(leer)",
        KC_CLIENT_ID: clientId || "(leer)",
        SESSION_COOKIE_SECURE: process.env.SESSION_COOKIE_SECURE ?? "(leer)",
        SESSION_COOKIE_DOMAIN: process.env.SESSION_COOKIE_DOMAIN ?? "(leer)",
      },
      cookies: {
        has_access_token: !!accessToken,
        has_refresh_token: !!refreshToken,
      },
      openid: null as any,
      userinfo: null as any,
    };

    // 1) ENV Check
    if (!envOk) {
      return NextResponse.json(
        { ok: false, step: "env", results },
        { status: 500 },
      );
    }

    // 2) OpenID-Konfiguration abrufen
    try {
      const r = await fetch(openIdConfigUrl!, { cache: "no-store" });
      const t = await r.text();
      let json: any = null;
      try {
        json = JSON.parse(t);
      } catch {}
      results.openid = {
        status: r.status,
        ok: r.ok,
        url: openIdConfigUrl,
        raw: json ?? t,
      };
      if (!r.ok) {
        return NextResponse.json(
          { ok: false, step: "openid", results },
          { status: 500 },
        );
      }
    } catch (e: any) {
      results.openid = { error: String(e) };
      return NextResponse.json(
        { ok: false, step: "openid_fetch", results },
        { status: 500 },
      );
    }

    // 3) /userinfo testen (nur wenn access token vorhanden)
    if (!accessToken) {
      results.userinfo = { note: "kein kc_access_token Cookie vorhanden" };
      return NextResponse.json(
        { ok: false, step: "no_access_token", results },
        { status: 401 },
      );
    }

    try {
      const userinfoUrl = `${baseUrl}/realms/${encodeURIComponent(realm!)}/protocol/openid-connect/userinfo`;
      const r = await fetch(userinfoUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      const t = await r.text();
      let json: any = null;
      try {
        json = JSON.parse(t);
      } catch {}
      results.userinfo = {
        status: r.status,
        ok: r.ok,
        url: userinfoUrl,
        raw: json ?? t,
      };
      if (!r.ok) {
        return NextResponse.json(
          { ok: false, step: "userinfo", results },
          { status: 500 },
        );
      }
    } catch (e: any) {
      results.userinfo = { error: String(e) };
      return NextResponse.json(
        { ok: false, step: "userinfo_fetch", results },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, results }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
