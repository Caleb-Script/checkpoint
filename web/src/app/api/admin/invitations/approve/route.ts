// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/admin/invitations/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { PresenceState } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/invitations/approve
 * Body: { shareCodes?: string[], invitationIds?: string[] }
 * Role: admin
 * - setzt approved=true, erzeugt Ticket falls nicht vorhanden (OUTSIDE)
 */
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ["admin"]);
  if (!auth.ok)
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );

  const body = await req.json();
  const shareCodes: string[] = body.shareCodes ?? [];
  const ids: string[] = body.invitationIds ?? [];

  if (!shareCodes.length && !ids.length) {
    return NextResponse.json(
      { ok: false, error: "provide shareCodes or invitationIds" },
      { status: 400 },
    );
  }

  const invitations = await prisma.invitation.findMany({
    where: { OR: [{ shareCode: { in: shareCodes } }, { id: { in: ids } }] },
    include: { ticket: true },
  });
  if (!invitations.length)
    return NextResponse.json(
      { ok: false, error: "no invitations found" },
      { status: 404 },
    );

  const results = [];
  for (const inv of invitations) {
    await prisma.invitation.update({
      where: { id: inv.id },
      data: { approved: true, approvedAt: new Date() },
    });

    let ticket = await prisma.ticket.findUnique({
      where: { invitationId: inv.id },
    });
    if (!ticket) {
      ticket = await prisma.ticket.create({
        data: {
          eventId: inv.eventId,
          invitationId: inv.id,
          currentState: PresenceState.OUTSIDE,
          revoked: false,
          lastRotatedAt: new Date(),
        },
      });
    }
    results.push({ invitationId: inv.id, ticketId: ticket.id });
  }

  return NextResponse.json({ ok: true, count: results.length, results });
}
