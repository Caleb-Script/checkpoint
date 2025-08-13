// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/rsvp/decline/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRsvpToken } from "@/lib/rsvp";

/**
 * POST /api/rsvp/decline
 * Body: { "token": string }
 * Antwort: { invitationId, status }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { token } = body || {};
        if (!token) {
            return NextResponse.json({ error: "token erforderlich" }, { status: 400 });
        }

        let payload: { invitationId: string; eventId: string };
        try {
            payload = verifyRsvpToken(token);
        } catch {
            return NextResponse.json({ error: "RSVP-Token ungültig/abgelaufen" }, { status: 401 });
        }

        const inv = await prisma.invitation.findUnique({ where: { id: payload.invitationId } });
        if (!inv) {
            return NextResponse.json({ error: "Invitation nicht gefunden" }, { status: 404 });
        }
        if (inv.eventId !== payload.eventId) {
            return NextResponse.json({ error: "Invitation gehört nicht zu diesem Event" }, { status: 403 });
        }

        const updated = await prisma.invitation.update({
            where: { id: inv.id },
            data: { status: "DECLINED" },
        });

        return NextResponse.json({
            invitationId: updated.id,
            status: updated.status,
            message: "RSVP abgelehnt.",
        });
    } catch (err) {
        console.error("rsvp decline failed", err);
        return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
    }
}