// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/debug/kc/route.ts
import { NextResponse } from "next/server";
import qs from "querystring";

const KC_BASE = process.env.KEYCLOAK_BASE_URL || "http://localhost:8080";
const KC_REALM = process.env.KEYCLOAK_REALM || "checkpoint";
const KC_CLIENT_ID = process.env.KEYCLOAK_ADMIN_CLIENT_ID || process.env.KEYCLOAK_CLIENT_ID || "";
const KC_CLIENT_SECRET = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || process.env.KEYCLOAK_CLIENT_SECRET || "";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const tokRes = await fetch(`${KC_BASE}/realms/${encodeURIComponent(KC_REALM)}/protocol/openid-connect/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: qs.stringify({
                grant_type: "client_credentials",
                client_id: KC_CLIENT_ID,
                client_secret: KC_CLIENT_SECRET
            }),
            cache: "no-store"
        });
        const tok = await tokRes.json();
        if (!tokRes.ok) return NextResponse.json({ ok: false, where: "token", status: tokRes.status, tok }, { status: 500 });

        // kleine Probe: Darf /users lesen?
        const r = await fetch(`${KC_BASE}/realms/${encodeURIComponent(KC_REALM)}/users?max=1`, {
            headers: { Authorization: `Bearer ${tok.access_token}` },
            cache: "no-store"
        });

        const payload = JSON.parse(Buffer.from(tok.access_token.split(".")[1], "base64").toString("utf8"));
        const roles = payload?.resource_access?.["realm-management"]?.roles || [];

        return NextResponse.json({
            ok: r.ok,
            http: r.status,
            roles,
            hint: "Benötigt: manage-users, view-users, query-users"
        });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
    }
}