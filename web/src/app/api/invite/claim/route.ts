// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/invite/claim/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/invite/claim?code=SHARECODE
 *  - gibt Status zum Code zurück (Event, Einladender, Rest-Kontingent)
 *
 * POST /api/invite/claim
 *  Body:
 *    {
 *      code: string,
 *      guest: { firstName?, lastName?, email?, phone? },
 *      rsvp?: "YES" | "NO",            // default "YES"
 *      seatWish?: { section?, row?, number? }  // optional, nur Wunsch
 *    }
 *  - legt/aktualisiert GuestProfile an (per email/phone),
 *  - erstellt eine neue Invitation, die per invitedByInvitationId verknüpft ist
 *  - status bleibt PENDING; kein Ticket!
 */

type SeatWish = { section?: string; row?: string; number?: string };
type ClaimBody = {
    code?: string;
    guest?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
    };
    rsvp?: "YES" | "NO";
    seatWish?: SeatWish;
};

function normalizePhone(p?: string | null) {
    if (!p) return null;
    return p.trim();
}
function normalizeEmail(e?: string | null) {
    if (!e) return null;
    return e.trim().toLowerCase();
}

/** Wie viele Einladungen eines Hosts zählen als "verbraucht"? (exkl. CANCELED) */
async function countUsedChildren(hostInvitationId: string) {
    const count = await prisma.invitation.count({
        where: {
            invitedByInvitationId: hostInvitationId,
            status: { not: "CANCELED" }, // Absagen und Pending zählen weiterhin als „belegt“
        },
    });
    return count;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get("code") || "").trim();
    if (!code) {
        return NextResponse.json({ ok: false, error: "code fehlt" }, { status: 400 });
    }

    const host = await prisma.invitation.findFirst({
        where: { shareCode: code },
        include: {
            event: { select: { id: true, name: true, startsAt: true } },
            guestProfile: { select: { firstName: true, lastName: true } },
            invitedChildren: { select: { id: true, status: true } },
        },
    });

    if (!host) {
        return NextResponse.json({ ok: false, error: "Ungültiger Code" }, { status: 404 });
    }

    const used = await countUsedChildren(host.id);
    const remaining = Math.max(0, host.maxInvitees - used);

    return NextResponse.json(
        {
            ok: true,
            hostInvitationId: host.id,
            event: host.event,
            hostName: [host.guestProfile?.firstName, host.guestProfile?.lastName].filter(Boolean).join(" ") || "Gast",
            maxInvitees: host.maxInvitees,
            used,
            remaining,
        },
        { status: 200 }
    );
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => ({}))) as ClaimBody;
        const code = (body.code || "").trim();
        if (!code) {
            return NextResponse.json({ ok: false, error: "code fehlt" }, { status: 400 });
        }

        // Host-Einladung + Event holen
        const host = await prisma.invitation.findFirst({
            where: { shareCode: code },
            include: {
                event: true,
                guestProfile: true,
                invitedChildren: { select: { id: true, status: true } },
            },
        });
        if (!host) {
            return NextResponse.json({ ok: false, error: "Ungültiger Code" }, { status: 404 });
        }

        // Kontingent prüfen
        const used = await countUsedChildren(host.id);
        const remaining = Math.max(0, host.maxInvitees - used);
        if (remaining <= 0) {
            return NextResponse.json({ ok: false, error: "Kontingent ausgeschöpft" }, { status: 403 });
        }

        // Gastdaten
        const g = body.guest || {};
        const email = normalizeEmail(g.email || null);
        const phone = normalizePhone(g.phone || null);
        const firstName = (g.firstName || "").trim() || null;
        const lastName = (g.lastName || "").trim() || null;
        const rsvp = (body.rsvp === "NO" ? "NO" : "YES") as "YES" | "NO";
        const seatWish = body.seatWish || {};

        if (!email && !phone) {
            return NextResponse.json({ ok: false, error: "Email oder Telefon erforderlich" }, { status: 400 });
        }

        // Prüfen, ob Gast bereits für dieses Event existiert (Doppelanlage verhindern)
        const existingInvitation = await prisma.invitation.findFirst({
            where: {
                eventId: host.eventId,
                guestProfile: {
                    OR: [
                        email ? { primaryEmail: email } : { id: "__no__" },
                        phone ? { phone } : { id: "__no__" },
                    ],
                },
            },
            include: { guestProfile: true },
        });

        if (existingInvitation) {
            // Wenn es bereits eine Einladung gibt, geben wir die Info zurück (kein Fehler)
            return NextResponse.json(
                {
                    ok: true,
                    info: "Es besteht bereits eine Einladung zu diesem Event für diese Kontaktdaten.",
                    invitationId: existingInvitation.id,
                    eventId: host.eventId,
                    remaining, // Kontingent bleibt unverändert
                },
                { status: 200 }
            );
        }

        // GuestProfile finden/erstellen
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
            // sanft mergen
            const needUpdate =
                (!!firstName && firstName !== guest.firstName) ||
                (!!lastName && lastName !== guest.lastName) ||
                (!!email && email !== guest.primaryEmail) ||
                (!!phone && phone !== guest.phone);

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

        // Neue Child-Invitation anlegen (kein Ticket, kein Approve)
        const child = await prisma.invitation.create({
            data: {
                eventId: host.eventId,
                guestProfileId: guest.id,
                invitedByInvitationId: host.id,
                status: "PENDING",
                rsvpChoice: rsvp, // YES/NO
                rsvpAt: new Date(),
                messageChannel: "invite-claim",
                maxInvitees: 0, // Standard: eingeladene Gäste dürfen nicht weiter einladen (kann Admin später erhöhen)
            },
        });

        // (Optional) Sitzwunsch markieren – wir erstellen KEINEN Seat und KEIN Ticket
        const hasSeatWish = !!(seatWish.section || seatWish.row || seatWish.number);
        if (hasSeatWish) {
            await prisma.invitation.update({
                where: { id: child.id },
                data: { messageChannel: "invite-claim-seatwish" }, // nur Marker
            });
        }

        // Restkontingent neu berechnen
        const usedAfter = await countUsedChildren(host.id);
        const remainingAfter = Math.max(0, host.maxInvitees - usedAfter);

        return NextResponse.json(
            {
                ok: true,
                invitationId: child.id,
                eventId: host.eventId,
                remaining: remainingAfter,
                message:
                    rsvp === "YES"
                        ? "Danke! Deine Zusage wurde gespeichert. Das Team prüft und schaltet ggf. ein Ticket frei."
                        : "Deine Absage wurde gespeichert.",
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("/api/invite/claim error:", err);
        return NextResponse.json({ ok: false, error: "Serverfehler" }, { status: 500 });
    }
}