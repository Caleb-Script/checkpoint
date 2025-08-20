// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/admin/invitations/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/invitations?eventId=...
 * Role: admin
 */
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["admin"]);
  if (!auth.ok)
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );

  const eventId = req.nextUrl.searchParams.get("eventId") || "";
  if (!eventId)
    return NextResponse.json(
      { ok: false, error: "eventId required" },
      { status: 400 },
    );

  const list = await prisma.invitation.findMany({
    where: { eventId },
    include: { guestProfile: true, ticket: { include: { seat: true } } },
    orderBy: { createdAt: "desc" },
  });

  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const mapped = list.map((i) => ({
    id: i.id,
    status: i.status,
    rsvpChoice: i.rsvpChoice,
    approved: i.approved,
    shareCode: i.shareCode,
    inviteLink: i.shareCode
      ? `${base}/invite?code=${encodeURIComponent(i.shareCode)}`
      : null,
    guest: {
      email: i.guestProfile.primaryEmail,
      phone: i.guestProfile.phone,
      name: `${i.guestProfile.firstName ?? ""} ${i.guestProfile.lastName ?? ""}`.trim(),
    },
    ticket: i.ticket
      ? {
          id: i.ticket.id,
          state: i.ticket.currentState,
          seat: i.ticket.seat
            ? {
                section: i.ticket.seat.section,
                row: i.ticket.seat.row,
                number: i.ticket.seat.number,
              }
            : null,
        }
      : null,
  }));

  return NextResponse.json({ ok: true, invitations: mapped });
}
