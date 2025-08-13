// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/admin/tickets/mint/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * POST /api/admin/tickets/mint
 * Body: { "invitationId": string, "seatId"?: string }
 * - Voraussetzung: Invitation.status === ACCEPTED
 * - Falls Ticket existiert → 409
 * - Erstellt Ticket ohne Verfallsdatum
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { invitationId, seatId } = body || {};
        if (!invitationId) {
            return NextResponse.json({ error: "invitationId erforderlich" }, { status: 400 });
        }

        const inv = await prisma.invitation.findUnique({
            where: { id: invitationId },
            include: { event: true, ticket: true },
        });
        if (!inv) {
            return NextResponse.json({ error: "Invitation nicht gefunden" }, { status: 404 });
        }
        if (inv.status !== "ACCEPTED") {
            return NextResponse.json({ error: "Invitation ist nicht ACCEPTED" }, { status: 409 });
        }
        if (inv.ticket) {
            return NextResponse.json({ error: "Ticket existiert bereits", ticketId: inv.ticket.id }, { status: 409 });
        }

        const ticket = await prisma.ticket.create({
            data: {
                eventId: inv.eventId,
                invitationId: inv.id,
                seatId: seatId || null,
                currentState: "OUTSIDE",
                revoked: false,
            },
        });

        return NextResponse.json({
            ticketId: ticket.id,
            eventId: ticket.eventId,
            state: ticket.currentState,
            message: "Ticket erstellt",
        });
    } catch (err) {
        console.error("mint ticket failed", err);
        return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
    }
}