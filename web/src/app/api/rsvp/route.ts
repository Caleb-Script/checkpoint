// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/rsvp/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/rsvp
 * Body:
 * {
 *   eventName?: string,         // oder
 *   eventId?: string,
 *   guest: { firstName?, lastName?, email?, phone? },
 *   seat?: { seatSection?, seatRow?, seatNumber? }, // optional (Wunsch)
 *   status: "accepted" | "declined"
 * }
 *
 * Verhalten:
 *  - Legt/aktualisiert Invitation auf status=PENDING.
 *  - Speichert RSVP (rsvpChoice YES/NO, rsvpAt=now).
 *  - KEIN Ticket wird erstellt (erst nach Admin-Freigabe).
 */

type Body = {
  eventName?: string;
  eventId?: string;
  guest?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  seat?: {
    seatSection?: string;
    seatRow?: string;
    seatNumber?: string;
  };
  status?: "accepted" | "declined";
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const eventName = body.eventName?.trim() || "";
    const eventId = body.eventId?.trim() || "";
    const status = body.status === "declined" ? "declined" : "accepted"; // default accepted

    const g = body.guest || {};
    const email = g.email?.trim().toLowerCase() || null;
    const phone = g.phone?.trim() || null;
    const firstName = g.firstName?.trim() || null;
    const lastName = g.lastName?.trim() || null;

    if (!eventName && !eventId) {
      return NextResponse.json(
        { ok: false, error: "eventName oder eventId erforderlich" },
        { status: 400 },
      );
    }
    if (!email && !phone) {
      return NextResponse.json(
        { ok: false, error: "Email oder Telefon erforderlich" },
        { status: 400 },
      );
    }

    // 1) Event auflösen
    const event = eventId
      ? await prisma.event.findUnique({ where: { id: eventId } })
      : await prisma.event.findFirst({ where: { name: eventName } });

    if (!event) {
      return NextResponse.json(
        { ok: false, error: "Event nicht gefunden" },
        { status: 404 },
      );
    }

    // 2) GuestProfile finden/erstellen
    let guest = await prisma.guestProfile.findFirst({
      where: {
        OR: [
          email ? { primaryEmail: email } : { id: "__no__" },
          phone ? { phone } : { id: "__no__" },
        ],
      },
    });

    if (!guest) {
      guest = await prisma.guestProfile.create({
        data: {
          primaryEmail: email,
          phone,
          firstName,
          lastName,
        },
      });
    } else {
      const needUpdate =
        (firstName && firstName !== guest.firstName) ||
        (lastName && lastName !== guest.lastName) ||
        (email && email !== guest.primaryEmail) ||
        (phone && phone !== guest.phone);
      if (needUpdate) {
        guest = await prisma.guestProfile.update({
          where: { id: guest.id },
          data: {
            firstName: firstName || guest.firstName,
            lastName: lastName || guest.lastName,
            primaryEmail: email || guest.primaryEmail,
            phone: phone || guest.phone,
          },
        });
      }
    }

    // 3) Invitation holen/erstellen (status bleibt PENDING!)
    let invitation = await prisma.invitation.findFirst({
      where: { eventId: event.id, guestProfileId: guest.id },
      orderBy: [{ createdAt: "desc" }],
    });

    if (!invitation) {
      invitation = await prisma.invitation.create({
        data: {
          eventId: event.id,
          guestProfileId: guest.id,
          status: "PENDING",
          messageChannel: "webapp",
        },
      });
    }

    // RSVP speichern (kein Auto-Ticket!)
    const rsvpChoice = status === "accepted" ? "YES" : "NO";
    invitation = await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        rsvpChoice,
        rsvpAt: new Date(),
        // Falls Absage: optional status = DECLINED setzen (Admin kann das auch manuell machen)
        ...(rsvpChoice === "NO"
          ? {
              status: "DECLINED",
              approved: false,
              approvedAt: null,
              approvedById: null,
            }
          : {}),
      },
    });

    // Optional: Sitzwunsch speichern (nur als Hinweis, kein Ticket-Bind)
    const s = body.seat || {};
    const hasSeatWish = s.seatSection || s.seatRow || s.seatNumber;
    if (hasSeatWish) {
      // wir erstellen KEIN Ticket und KEINE feste Seat-Zuweisung – Admin entscheidet später
      // Wenn du den Wunsch im System notieren willst, z.B. als Einladungskommentar:
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          messageChannel: "webapp-seatwish", // nur als Flag, wenn du möchtest
        },
      });
    }

    return NextResponse.json(
      {
        ok: true,
        invitationId: invitation.id,
        // Hinweis für Frontend:
        info:
          rsvpChoice === "YES"
            ? "Zusage gespeichert. Warte auf Bestätigung durch das Team."
            : "Absage gespeichert.",
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("/api/rsvp error:", err);
    return NextResponse.json(
      { ok: false, error: "Serverfehler" },
      { status: 500 },
    );
  }
}
