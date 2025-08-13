// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/admin/invitations/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/invitations?eventId=...
 * Antwort:
 * {
 *   ok: true,
 *   invitations: [
 *     {
 *       id, status, rsvpChoice, approved, shareCode, inviteLink,
 *       type: "main" | "plusone",
 *       invitedByName?: string | null,
 *       maxInvitees?: number | null,
 *       guest: { email, phone, name },
 *       ticket: { id, state, seat? }
 *     }, ...
 *   ]
 * }
 */
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId") || "";
  if (!eventId) {
    return NextResponse.json({ ok: false, error: "eventId required" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ ok: false, error: "event not found" }, { status: 404 });

  const list = await prisma.invitation.findMany({
    where: { eventId },
    include: {
      guestProfile: true,
      ticket: { include: { seat: true } },
      invitedBy: { include: { guestProfile: true } }, // Parent für Plus-Ones
    },
    orderBy: { createdAt: "desc" },
  });

  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const mapped = list.map((i) => {
    const type = i.invitedByInvitationId ? "plusone" as const : "main" as const;
    const invitedByName = i.invitedBy
      ? `${i.invitedBy.guestProfile?.firstName ?? ""} ${i.invitedBy.guestProfile?.lastName ?? ""}`.trim() || null
      : null;

    return {
      id: i.id,
      status: i.status,
      rsvpChoice: i.rsvpChoice,
      approved: i.approved,
      shareCode: i.shareCode,
      inviteLink: i.shareCode ? `${base}/invite?code=${encodeURIComponent(i.shareCode)}` : null,
      type,
      invitedByName,
      maxInvitees: i.maxInvitees ?? 0,
      guest: {
        email: i.guestProfile?.primaryEmail ?? null,
        phone: i.guestProfile?.phone ?? null,
        name: `${i.guestProfile?.firstName ?? ""} ${i.guestProfile?.lastName ?? ""}`.trim() || null,
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
    };
  });

  return NextResponse.json({ ok: true, invitations: mapped }, { status: 200 });
}
