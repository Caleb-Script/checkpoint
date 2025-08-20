// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/invitations/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KC_CLIENT_ID =
  process.env.KC_CLIENT_ID ||
  process.env.NEXT_PUBLIC_KC_CLIENT_ID ||
  "checkpoint-guest";

function decodeJwt(token: string): any | null {
  try {
    const [_, payload] = token.split(".");
    return payload
      ? JSON.parse(Buffer.from(payload, "base64").toString("utf-8"))
      : null;
  } catch {
    return null;
  }
}

function extractAuth(req: NextRequest) {
  const token = req.cookies.get("kc_access_token")?.value || "";
  if (!token)
    return { ok: false, status: 401, error: "Nicht eingeloggt" as const };
  const payload = decodeJwt(token) || {};
  const roles: string[] = Array.from(
    new Set([
      ...(payload?.realm_access?.roles || []),
      ...(payload?.resource_access?.[KC_CLIENT_ID]?.roles || []),
    ]),
  );
  if (!roles.includes("admin") && !roles.includes("security")) {
    return { ok: false, status: 403, error: "Keine Berechtigung" as const };
  }
  const keycloakId = payload?.sub as string | undefined;
  return { ok: true, keycloakId };
}

/**
 * POST /api/invitations/approve
 * Body: { invitationId: string, seat?: { section?, row?, number? } }
 *
 * Wirkung:
 *  - approved=true, approvedAt=now, approvedById=adminUser.id
 *  - status -> ACCEPTED (falls vorher DECLINED/PENDING)
 *  - Ticket wird erstellt (oder Sitz aktualisiert), falls keines existiert
 */
export async function POST(req: NextRequest) {
  const auth = extractAuth(req);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const invitationId = (body?.invitationId || "").trim();
  const seat = body?.seat || {};
  if (!invitationId) {
    return NextResponse.json({ error: "invitationId fehlt" }, { status: 400 });
  }

  // Admin/User, der freigibt
  let approvedById: string | null = null;
  if (auth.keycloakId) {
    const adminUser = await prisma.user.findUnique({
      where: { keycloakId: auth.keycloakId },
    });
    if (adminUser) approvedById = adminUser.id;
  }

  // Einladung laden
  const inv = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { event: true, ticket: true },
  });
  if (!inv)
    return NextResponse.json(
      { error: "Invitation nicht gefunden" },
      { status: 404 },
    );

  // Optional Sitz anlegen/suchen
  let seatId: string | null = null;
  if (seat.section || seat.row || seat.number) {
    const existing = await prisma.seat.findFirst({
      where: {
        eventId: inv.eventId,
        section: seat.section || null,
        row: seat.row || null,
        number: seat.number || null,
      },
    });
    const ensured = existing
      ? existing
      : await prisma.seat.create({
          data: {
            eventId: inv.eventId,
            section: seat.section || null,
            row: seat.row || null,
            number: seat.number || null,
            note: null,
          },
        });
    seatId = ensured.id;
  }

  // Approve + Ticket
  const now = new Date();
  let ticketId: string;

  if (!inv.ticket) {
    const ticket = await prisma.ticket.create({
      data: {
        eventId: inv.eventId,
        invitationId: inv.id,
        seatId: seatId || null,
        currentState: "OUTSIDE",
        revoked: false,
      },
    });
    ticketId = ticket.id;
  } else {
    const updated = await prisma.ticket.update({
      where: { id: inv.ticket.id },
      data: { seatId: seatId ?? inv.ticket.seatId ?? null },
    });
    ticketId = updated.id;
  }

  const updatedInvitation = await prisma.invitation.update({
    where: { id: inv.id },
    data: {
      approved: true,
      approvedAt: now,
      approvedById,
      status: "ACCEPTED",
    },
    include: {
      guestProfile: true,
      ticket: { include: { seat: true } },
      event: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(
    { ok: true, invitation: updatedInvitation, ticketId },
    { status: 200 },
  );
}
