// /Users/gentlebookpro/Projekte/checkpoint/web/src/lib/authz.ts
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export type AuthzResult = { ok: boolean; role?: string; reason?: string };

export function requireRole(req: NextRequest, allowed: string[]): AuthzResult {
  // DEV-Bypass für Postman
  const devRole = req.headers.get("x-role")?.toLowerCase();
  if (devRole && allowed.map((r) => r.toLowerCase()).includes(devRole)) {
    return { ok: true, role: devRole };
  }

  // Versuche Keycloak-Token aus Cookie oder Authorization zu lesen
  const authz = req.headers.get("authorization");
  const cookie = req.cookies.get("kc_access_token")?.value;

  const token = authz?.startsWith("Bearer ") ? authz.slice(7) : cookie;
  if (!token) return { ok: false, reason: "no-token" };

  try {
    // Nur DECODEN (keine Signaturprüfung in DEV); in PROD: jwks prüfen!
    const decoded: any = jwt.decode(token);
    const roles: string[] = [
      ...(decoded?.realm_access?.roles ?? []),
      ...Object.values(decoded?.resource_access ?? {}).flatMap(
        (x: any) => x?.roles ?? [],
      ),
    ].map((r: string) => r.toLowerCase());

    const ok = allowed.some((r) => roles.includes(r.toLowerCase()));
    return ok
      ? {
          ok: true,
          role: roles.find((r) =>
            allowed.map((a) => a.toLowerCase()).includes(r),
          ),
        }
      : { ok: false, reason: "forbidden" };
  } catch {
    return { ok: false, reason: "bad-token" };
  }
}
