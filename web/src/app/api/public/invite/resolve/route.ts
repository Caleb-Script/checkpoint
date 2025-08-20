// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/public/invite/resolve/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/claim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") || "";
  if (!code)
    return NextResponse.json(
      { ok: false, error: "code required" },
      { status: 400 },
    );

  const inv = await prisma.invitation.findUnique({
    where: { shareCode: code },
    include: {
      event: true,
      guestProfile: true,
      invitedBy: { include: { guestProfile: true } },
      _count: { select: { invitedChildren: true } },
      ticket: true,
    },
  });
  if (!inv)
    return NextResponse.json(
      { ok: false, error: "invitation not found" },
      { status: 404 },
    );

  const max = inv.maxInvitees ?? 0;
  const used = inv._count.invitedChildren ?? 0;
  const free = Math.max(0, max - used);
  const isMain = !inv.invitedByInvitationId;

  // Registrierungs-Token nur für Haupt-Invite (damit er sich früh registrieren kann)
  const regToken = isMain
    ? signToken({ kind: "invite-reg", invitationId: inv.id }, 60 * 60 * 4)
    : null; // 4h

  return NextResponse.json({
    ok: true,
    invitation: {
      id: inv.id,
      status: inv.status,
      rsvpChoice: inv.rsvpChoice,
      approved: inv.approved,
      event: {
        id: inv.eventId,
        name: inv.event.name,
        startsAt: inv.event.startsAt,
        endsAt: inv.event.endsAt,
      },
      guest: {
        email: inv.guestProfile?.primaryEmail,
        phone: inv.guestProfile?.phone,
        firstName: inv.guestProfile?.firstName,
        lastName: inv.guestProfile?.lastName,
      },
      hasTicket: !!inv.ticket,
      invitedBy: inv.invitedBy
        ? {
            name:
              `${inv.invitedBy.guestProfile?.firstName ?? ""} ${inv.invitedBy.guestProfile?.lastName ?? ""}`.trim() ||
              null,
          }
        : null,
      plusOne: { max, used, free },
      regToken,
    },
  });
}
