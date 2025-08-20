// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/rsvp/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRsvpToken } from "@/lib/rsvp";

/**
 * POST /api/rsvp/accept
 * Body:
 * {
 *   "token": string,        // RSVP-Token
 *   "firstName": string,
 *   "lastName": string,
 *   "email"?: string,
 *   "phone"?: string
 * }
 *
 * Antwort: { invitationId, status, guestProfileId }
 *
 * Bemerkung: kein Keycloak-Account nötig. Wir pflegen GuestProfile & Invitation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, firstName, lastName, email, phone } = body || {};

    if (!token || !firstName || !lastName) {
      return NextResponse.json(
        { error: "token, firstName, lastName erforderlich" },
        { status: 400 },
      );
    }

    let payload: { invitationId: string; eventId: string; canInvite?: number };
    try {
      payload = verifyRsvpToken(token);
    } catch {
      return NextResponse.json(
        { error: "RSVP-Token ungültig/abgelaufen" },
        { status: 401 },
      );
    }

    const inv = await prisma.invitation.findUnique({
      where: { id: payload.invitationId },
      include: { guestProfile: true },
    });
    if (!inv) {
      return NextResponse.json(
        { error: "Invitation nicht gefunden" },
        { status: 404 },
      );
    }
    if (inv.eventId !== payload.eventId) {
      return NextResponse.json(
        { error: "Invitation gehört nicht zu diesem Event" },
        { status: 403 },
      );
    }
    if (inv.status === "CANCELED" || inv.status === "DECLINED") {
      return NextResponse.json(
        { error: `Invitation bereits ${inv.status}` },
        { status: 409 },
      );
    }

    // GuestProfile updaten
    const gp = await prisma.guestProfile.update({
      where: { id: inv.guestProfileId },
      data: {
        firstName,
        lastName,
        primaryEmail: email ?? inv.guestProfile.primaryEmail,
        phone: phone ?? inv.guestProfile.phone,
      },
    });

    // Invitation akzeptieren
    const updated = await prisma.invitation.update({
      where: { id: inv.id },
      data: { status: "ACCEPTED" },
    });

    return NextResponse.json({
      invitationId: updated.id,
      guestProfileId: gp.id,
      status: updated.status,
      message: "RSVP akzeptiert. Admin muss Ticket genehmigen/minten.",
    });
  } catch (err) {
    console.error("rsvp accept failed", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
