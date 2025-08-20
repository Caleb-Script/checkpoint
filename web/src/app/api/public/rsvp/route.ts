// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/public/rsvp/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { InvitationStatus, RsvpChoice } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/public/rsvp
 * Body: { code: string, choice: "YES"|"NO", guest?: { firstName?, lastName?, email?, phone? } }
 * Keine Rolle nötig
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, choice, guest } = body || {};
  if (!code || !choice)
    return NextResponse.json(
      { ok: false, error: "code & choice required" },
      { status: 400 },
    );

  const inv = await prisma.invitation.findUnique({
    where: { shareCode: code },
    include: { guestProfile: true },
  });
  if (!inv)
    return NextResponse.json(
      { ok: false, error: "invitation not found" },
      { status: 404 },
    );

  // Optional: Gastdaten aktualisieren
  if (guest && inv.guestProfile) {
    await prisma.guestProfile.update({
      where: { id: inv.guestProfileId },
      data: {
        firstName: guest.firstName ?? inv.guestProfile.firstName,
        lastName: guest.lastName ?? inv.guestProfile.lastName,
        primaryEmail: guest.email ?? inv.guestProfile.primaryEmail,
        phone: guest.phone ?? inv.guestProfile.phone,
      },
    });
  }

  const rsvpChoice = choice === "YES" ? RsvpChoice.YES : RsvpChoice.NO;
  const status =
    choice === "YES" ? InvitationStatus.ACCEPTED : InvitationStatus.DECLINED;

  const updated = await prisma.invitation.update({
    where: { id: inv.id },
    data: { rsvpChoice, rsvpAt: new Date(), status },
  });

  return NextResponse.json({
    ok: true,
    invitation: {
      id: updated.id,
      status: updated.status,
      rsvpChoice: updated.rsvpChoice,
    },
  });
}
