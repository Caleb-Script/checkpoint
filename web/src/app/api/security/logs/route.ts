// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/security/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KC_CLIENT_ID =
  process.env.KC_CLIENT_ID || process.env.NEXT_PUBLIC_KC_CLIENT_ID || "checkpoint-guest";

function decodeJwt(token: string): any | null {
  try {
    const [, payload] = token.split(".");
    return payload ? JSON.parse(Buffer.from(payload, "base64").toString("utf-8")) : null;
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
function ensureAuth(req: NextRequest) {
  const token = req.cookies.get("kc_access_token")?.value || "";
  if (!token) return { ok: false, status: 401, error: "Nicht eingeloggt" as const };
  const roles = extractRoles(token);
  if (!roles.includes("admin") && !roles.includes("security")) {
    return { ok: false, status: 403, error: "Keine Berechtigung" as const };
  }
  return { ok: true };
}

/**
 * GET /api/security/logs?eventId=...&limit=100
 *  - liefert die letzten ScanLogs (neuste zuerst) mit Gastname & Sitz
 */
export async function GET(req: NextRequest) {
  const auth = ensureAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId") || undefined;
  const limit = Math.max(1, Math.min(500, Number(searchParams.get("limit") || 100)));

  const logs = await prisma.scanLog.findMany({
    where: { ...(eventId ? { eventId } : {}) },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      ticket: {
        include: {
          invitation: {
            include: { guestProfile: true },
          },
          seat: true,
        },
      },
    },
  });

  const rows = logs.map((l) => {
    const guest = l.ticket?.invitation?.guestProfile;
    const seat = l.ticket?.seat;
    const guestName = [guest?.firstName, guest?.lastName].filter(Boolean).join(" ") || undefined;
    const seatNumber = seat
      ? [seat.section, seat.row, seat.number].filter(Boolean).join(" ")
      : undefined;
    return {
      id: l.id,
      ticketId: l.ticketId,
      eventId: l.eventId,
      direction: l.direction,
      verdict: l.verdict,
      gate: l.gate,
      createdAt: l.createdAt,
      guestName,
      seatNumber,
    };
  });

  return NextResponse.json({ ok: true, logs: rows }, { status: 200 });
}