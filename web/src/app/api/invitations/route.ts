// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/admin/invitations/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * POST /api/admin/invitations
 * Body:
 * {
 *   "eventId": "evt_xxx",
 *   "firstName"?: string,
 *   "lastName"?: string,
 *   "email"?: string,
 *   "phone"?: string,
 *   "canInvite"?: number
 * }
 *
 * Antwort: { invitationId, guestProfileId, status }
 *
 * Hinweis: In echt sollte hier eine Admin-Rollenprüfung erfolgen.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { eventId, firstName, lastName, email, phone, canInvite } = body || {};

        if (!eventId) {
            return NextResponse.json({ error: "eventId erforderlich" }, { status: 400 });
        }
        if (!email && !phone) {
            return NextResponse.json({ error: "email oder phone erforderlich" }, { status: 400 });
        }

        // GuestProfile suchen/erstellen (über email bevorzugt)
        let gp = null as any;

        if (email) {
            gp = await prisma.guestProfile.findFirst({ where: { primaryEmail: email } });
        }
        if (!gp && phone) {
            gp = await prisma.guestProfile.findFirst({ where: { phone } });
        }

        if (!gp) {
            gp = await prisma.guestProfile.create({
                data: {
                    primaryEmail: email || null,
                    phone: phone || null,
                    firstName: firstName || null,
                    lastName: lastName || null,
                },
            });
        } else {
            // leicht updaten (keine userId hier)
            await prisma.guestProfile.update({
                where: { id: gp.id },
                data: {
                    firstName: firstName ?? gp.firstName,
                    lastName: lastName ?? gp.lastName,
                    primaryEmail: email ?? gp.primaryEmail,
                    phone: phone ?? gp.phone,
                },
            });
        }

        // Invitation anlegen (PENDING)
        const inv = await prisma.invitation.create({
            data: {
                eventId,
                guestProfileId: gp.id,
                status: "PENDING",
                messageChannel: "admin-api",
                // canInvite speichern wir in Invitation nicht direkt → Option: ShareGuard/Note
                // Für Demo: wir codieren es in "messageChannel" als Metadata
            },
        });

        return NextResponse.json({
            invitationId: inv.id,
            guestProfileId: gp.id,
            status: inv.status,
            message: "Invitation erstellt (PENDING)",
            canInvite: typeof canInvite === "number" ? canInvite : undefined,
        });
    } catch (err) {
        console.error("create invitation failed", err);
        return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
    }
}