// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/public/tickets/info/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, signToken } from "@/lib/claim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get("token") || "";
    const v = verifyToken(token);
    if (!v.ok || v.data.kind !== "ticket") {
        return NextResponse.json({ ok: false, error: "invalid-token" }, { status: 401 });
    }

    const ticket = await prisma.ticket.findUnique({
        where: { id: v.data.ticketId! },
        include: {
            event: true,
            seat: true,
            invitation: { include: { guestProfile: true } },
        },
    });
    if (!ticket || ticket.invitationId !== v.data.invitationId) {
        return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
    }
    if (ticket.revoked) {
        return NextResponse.json({ ok: false, error: "revoked" }, { status: 410 });
    }

    // Rotationsfenster
    const rotateSeconds = ticket.event.rotateSeconds ?? 60;

    // Restlaufzeit des übergebenen Tokens (falls dein verifyToken das nicht liefert, setze 0)
    const now = Math.floor(Date.now() / 1000);
    const exp = (v.data as any).exp ?? now + rotateSeconds;
    const ttl = Math.max(0, exp - now);

    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const pngUrl = `${base}/api/public/tickets/qr.png?token=${encodeURIComponent(token)}`;
    const pdfUrl = `${base}/api/public/tickets/qr.pdf?token=${encodeURIComponent(token)}`;

    const guest = ticket.invitation.guestProfile;
    const name =
        `${guest?.firstName ?? ""} ${guest?.lastName ?? ""}`.trim() ||
        guest?.primaryEmail ||
        guest?.phone ||
        "Gast";

    return NextResponse.json({
        ok: true,
        ticket: {
            id: ticket.id,
            state: ticket.currentState,
            seat: ticket.seat ? {
                section: ticket.seat.section,
                row: ticket.seat.row,
                number: ticket.seat.number
            } : null
        },
        event: {
            id: ticket.event.id,
            name: ticket.event.name,
            startsAt: ticket.event.startsAt,
            endsAt: ticket.event.endsAt,
            rotateSeconds
        },
        guest: { name },
        media: { pngUrl, pdfUrl },
        token: { value: token, ttl, exp },
    }, {
        headers: { "Cache-Control": "no-store" }
    });
}