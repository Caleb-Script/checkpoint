// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/invitations/share/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KC_CLIENT_ID =
  process.env.KC_CLIENT_ID ||
  process.env.NEXT_PUBLIC_KC_CLIENT_ID ||
  "checkpoint-guest";

function decodeJwt(token: string): any | null {
  try {
    const [, payload] = (token || "").split(".");
    return payload
      ? JSON.parse(Buffer.from(payload, "base64").toString("utf-8"))
      : null;
  } catch {
    return null;
  }
}
function extractRoles(access: string): string[] {
  const p = decodeJwt(access) || {};
  const realm: string[] = p?.realm_access?.roles || [];
  const client: string[] = p?.resource_access?.[KC_CLIENT_ID]?.roles || [];
  return Array.from(new Set([...(realm || []), ...(client || [])]));
}
function ensureAdmin(req: NextRequest) {
  const token = req.cookies.get("kc_access_token")?.value || "";
  if (!token)
    return { ok: false, status: 401, error: "Nicht eingeloggt" as const };
  const roles = extractRoles(token);
  if (!roles.includes("admin") && !roles.includes("security")) {
    return { ok: false, status: 403, error: "Keine Berechtigung" as const };
  }
  return { ok: true };
}

function makeShareCode() {
  // kurze, robuste ID (ohne verwechselbare Zeichen)
  const raw = crypto.randomBytes(8).toString("base64url");
  return raw.replace(/[-_]/g, "").slice(0, 10);
}

/**
 * GET /api/invitations/share?invitationId=inv_xxx&base=https://your-host
 *   - gibt aktuellen Share-Link + Restkontingent zurück
 *
 * POST /api/invitations/share
 * Body: {
 *   invitationId: string,
 *   maxInvitees?: number,      // Setzen/Ändern des Kontingents
 *   rotate?: boolean,          // true => neuen Code generieren
 *   base?: string              // optional: Basis-URL für Link-Bau
 * }
 *   - setzt Kontingent, erzeugt (oder rotiert) shareCode, liefert Link + Status
 */
export async function GET(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const invitationId = (searchParams.get("invitationId") || "").trim();
  if (!invitationId) {
    return NextResponse.json({ error: "invitationId fehlt" }, { status: 400 });
  }

  const baseRaw = (searchParams.get("base") || "").trim();
  let base = baseRaw || req.headers.get("origin") || "";
  if (base && !base.startsWith("http")) base = `https://${base}`;
  base = base.replace(/\/+$/, "");

  const inv = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      guestProfile: {
        select: { firstName: true, lastName: true, primaryEmail: true },
      },
      event: { select: { id: true, name: true } },
      invitedChildren: { select: { id: true } },
    },
  });
  if (!inv)
    return NextResponse.json(
      { error: "Invitation nicht gefunden" },
      { status: 404 },
    );

  const used = inv.invitedChildren.length;
  const allowed = inv.maxInvitees;
  const remaining = Math.max(0, allowed - used);

  const link = inv.shareCode
    ? `${base}/invite?code=${encodeURIComponent(inv.shareCode)}`
    : null;

  return NextResponse.json(
    {
      ok: true,
      invitationId,
      event: inv.event,
      guest: inv.guestProfile,
      maxInvitees: inv.maxInvitees,
      used,
      remaining,
      shareCode: inv.shareCode || null,
      shareLink: link,
    },
    { status: 200 },
  );
}

export async function POST(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}) as any);
  const invitationId = (body?.invitationId || "").trim();
  if (!invitationId) {
    return NextResponse.json({ error: "invitationId fehlt" }, { status: 400 });
  }
  const rotate = !!body?.rotate;
  const maxInvitees =
    typeof body?.maxInvitees === "number"
      ? Math.max(0, Math.floor(body.maxInvitees))
      : undefined;

  let base = (body?.base || req.headers.get("origin") || "").toString();
  if (base && !base.startsWith("http")) base = `https://${base}`;
  base = base.replace(/\/+$/, "");

  const inv = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { invitedChildren: true, event: true, guestProfile: true },
  });
  if (!inv)
    return NextResponse.json(
      { error: "Invitation nicht gefunden" },
      { status: 404 },
    );

  // ShareCode sicherstellen/rotieren
  let nextCode = inv.shareCode || makeShareCode();
  if (rotate) {
    nextCode = makeShareCode();
  }

  const updated = await prisma.invitation.update({
    where: { id: inv.id },
    data: {
      ...(maxInvitees !== undefined ? { maxInvitees } : {}),
      shareCode: nextCode,
    },
    include: { invitedChildren: true, event: true, guestProfile: true },
  });

  const used = updated.invitedChildren.length;
  const remaining = Math.max(0, updated.maxInvitees - used);
  const link = `${base}/invite?code=${encodeURIComponent(updated.shareCode!)}`;

  return NextResponse.json(
    {
      ok: true,
      invitationId: updated.id,
      event: updated.event,
      guest: updated.guestProfile,
      maxInvitees: updated.maxInvitees,
      used,
      remaining,
      shareCode: updated.shareCode,
      shareLink: link,
    },
    { status: 200 },
  );
}
