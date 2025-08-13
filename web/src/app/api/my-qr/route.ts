// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/my-qr/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { generateSignedQrCode, createTicketJwt } from "@/lib/qrcode";

// ▶️ WICHTIG: Node.js Runtime (Buffer verfügbar, keine Edge-Einschränkungen)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/my-qr
 * Body:
 * {
 *   "direction"?: "IN" | "OUT",   // default "IN"
 *   "deviceId"?: string,          // optional Gerätekennung, z.B. "guest-web"
 *   "eventId"?: string            // optional: bei mehreren Tickets gezielt wählen
 * }
 *
 * Ermittelt den Benutzer über httpOnly-Cookies (kc_access_token).
 * 1) sub (Keycloak user id) -> User.keycloakId -> GuestProfile.userId -> Invitation(ACCEPTED) -> Ticket
 * 2) Fallback: email im Token -> GuestProfile.primaryEmail -> Invitation(ACCEPTED) -> Ticket
 *
 * Antwort 200:
 * {
 *   ticketId: string,
 *   eventId: string,
 *   direction: "IN" | "OUT",
 *   qr: "data:image/png;base64,...",
 *   token: string,
 *   expiresInSeconds: number
 * }
 */

type Body = {
    direction?: "IN" | "OUT";
    deviceId?: string;
    eventId?: string;
};

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => ({}))) as Body;
        const direction: "IN" | "OUT" = body.direction === "OUT" ? "OUT" : "IN";
        const deviceId = body.deviceId || "guest-web";
        const targetEventId = body.eventId || null;

        // 1) Auth über Cookie (kein Bearer-Header mehr)
        const accessToken = req.cookies.get("kc_access_token")?.value || null;
        if (!accessToken) {
            return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
        }

        // Token decodieren (ohne Signaturprüfung) und Gültigkeit grob prüfen
        let decoded: any = null;
        try {
            decoded = jwt.decode(accessToken);
        } catch {
            return NextResponse.json({ error: "Token unlesbar" }, { status: 401 });
        }
        if (!decoded || typeof decoded !== "object") {
            return NextResponse.json({ error: "Token ungültig" }, { status: 401 });
        }
        const nowSec = Math.floor(Date.now() / 1000);
        const exp: number | undefined = decoded.exp;
        if (typeof exp === "number" && exp <= nowSec) {
            return NextResponse.json({ error: "Session abgelaufen" }, { status: 401 });
        }

        const kcSub: string | null = decoded?.sub || null;
        const emailFromToken: string | null =
            (decoded?.email && typeof decoded.email === "string"
                ? decoded.email.toLowerCase()
                : null) || null;

        if (!kcSub && !emailFromToken) {
            return NextResponse.json(
                { error: "Token enthält weder sub noch email" },
                { status: 400 }
            );
        }

        // 2) Ticket anhand User/GuestProfile ermitteln
        type TicketWithEvent = Awaited<ReturnType<typeof prisma.ticket.findUnique>> & {
            event: { id: string } | null;
        };

        let ticket: TicketWithEvent | null = null;

        // a) via kcSub (User.keycloakId)
        if (kcSub) {
            const user = await prisma.user.findUnique({
                where: { keycloakId: kcSub },
                select: { id: true },
            });

            if (user) {
                const invitations = await prisma.invitation.findMany({
                    where: {
                        guestProfile: { userId: user.id },
                        status: "ACCEPTED",
                        ...(targetEventId ? { eventId: targetEventId } : {}),
                    },
                    include: { ticket: true, event: true },
                    orderBy: [{ updatedAt: "desc" }],
                });

                const invWithTicket = invitations.find((i) => !!i.ticket);
                if (invWithTicket?.ticket) {
                    ticket = await prisma.ticket.findUnique({
                        where: { id: invWithTicket.ticket.id },
                        include: { event: { select: { id: true } } },
                    });
                }
            }
        }

        // b) Fallback via email
        if (!ticket && emailFromToken) {
            const invitations = await prisma.invitation.findMany({
                where: {
                    guestProfile: { primaryEmail: emailFromToken },
                    status: "ACCEPTED",
                    ...(targetEventId ? { eventId: targetEventId } : {}),
                },
                include: { ticket: true, event: true },
                orderBy: [{ updatedAt: "desc" }],
            });

            const invWithTicket = invitations.find((i) => !!i.ticket);
            if (invWithTicket?.ticket) {
                ticket = await prisma.ticket.findUnique({
                    where: { id: invWithTicket.ticket.id },
                    include: { event: { select: { id: true } } },
                });
            }
        }

        if (!ticket) {
            return NextResponse.json(
                {
                    error:
                        "Kein Ticket gefunden. Prüfe, ob eine zugesagte Einladung (ACCEPTED) mit Ticket existiert.",
                },
                { status: 404 }
            );
        }

        // optional: gezieltes Event
        if (targetEventId && ticket.event?.id !== targetEventId) {
            return NextResponse.json(
                { error: "Ticket gehört nicht zum angeforderten Event" },
                { status: 403 }
            );
        }

        // 3) Signiertes QR-Token generieren + Data-URL
        const [qrDataUrl, token] = await Promise.all([
            generateSignedQrCode(ticket.id, direction, deviceId),
            createTicketJwt(ticket.id, direction, deviceId),
        ]);

        // 4) Antwort
        return NextResponse.json(
            {
                ticketId: ticket.id,
                eventId: ticket.event?.id || null,
                direction,
                qr: qrDataUrl,
                token,
                expiresInSeconds: 60,
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("my-qr API Fehler:", err);
        return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
    }
}