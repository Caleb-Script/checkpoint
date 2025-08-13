// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/tickets/qr/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateSignedQrCode, createTicketJwt } from "@/lib/qrcode";

/**
 * API: Erzeuge signierten QR für ein Ticket / eine Einladung.
 *
 * POST /api/tickets/qr
 * Body (JSON):
 * {
 *   "ticketId"?: string,
 *   "invitationId"?: string,
 *   "direction"?: "IN" | "OUT",   // default: "IN"
 *   "deviceId"?: string           // optional: z.B. "web-client" oder Gerätefingerprint
 * }
 *
 * Response 200:
 * {
 *   "ticketId": string,
 *   "eventId": string,
 *   "direction": "IN" | "OUT",
 *   "qr": "data:image/png;base64,...",   // Data-URL des QR
 *   "token": string,                     // JWT im QR (kurzlebig)
 *   "expiresInSeconds": number           // wie lange das Token gültig ist (entspricht qrcode.ts)
 * }
 *
 * Hinweise:
 * - Nutzt bestehende Helper in src/lib/qrcode.ts (JWT + QR Rendering).
 * - Falls nur invitationId übergeben wird, wird das verknüpfte Ticket geladen.
 * - Falls bei einer ACCEPTED-Einladung noch kein Ticket existiert, wird keines automatisch erzeugt:
 *   -> Der RSVP-Flow legt bei Zusage bereits ein Ticket an (siehe /api/rsvp).
 * - Diese Route macht KEINE Rollenprüfung, weil sie typischerweise von Admin/Sender-UI aufgerufen wird,
 *   die bereits geschützt ist. Wenn du möchtest, können wir hier leicht einen Rollencheck nachrüsten.
 */

type Body = {
    ticketId?: string;
    invitationId?: string;
    direction?: "IN" | "OUT";
    deviceId?: string;
};

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => ({}))) as Body;

        const direction: "IN" | "OUT" = body.direction === "OUT" ? "OUT" : "IN";
        const deviceId = body.deviceId || undefined;

        let ticketId = body.ticketId;
        let eventId: string | null = null;

        // 1) Ticket ermitteln
        if (!ticketId) {
            const invitationId = body.invitationId;
            if (!invitationId) {
                return NextResponse.json(
                    { error: "ticketId oder invitationId ist erforderlich." },
                    { status: 400 }
                );
            }

            const inv = await prisma.invitation.findUnique({
                where: { id: invitationId },
                include: { ticket: true },
            });

            if (!inv) {
                return NextResponse.json(
                    { error: "Einladung nicht gefunden." },
                    { status: 404 }
                );
            }
            if (!inv.ticket) {
                return NextResponse.json(
                    { error: "Zu dieser Einladung existiert noch kein Ticket." },
                    { status: 409 }
                );
            }

            ticketId = inv.ticket.id;
            eventId = inv.eventId;
        }

        // 2) Ticket + Event validieren
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId! },
            include: { event: true, invitation: true },
        });

        if (!ticket) {
            return NextResponse.json({ error: "Ticket nicht gefunden." }, { status: 404 });
        }
        eventId = ticket.eventId;

        // 3) Signiertes Token & QR-Code generieren
        // generateSignedQrCode() rendert direkt Data-URL,
        // createTicketJwt() gibt dir das nackte JWT (praktisch, wenn du es separat mitschicken willst)
        const [qrDataUrl, token] = await Promise.all([
            generateSignedQrCode(ticket.id, direction, deviceId),
            createTicketJwt(ticket.id, direction, deviceId),
        ]);

        // 4) Antworte mit allen nützlichen Infos
        // Ablaufzeit muss synchron mit qrcode.ts gehalten werden (dort aktuell 60s).
        return NextResponse.json(
            {
                ticketId: ticket.id,
                eventId,
                direction,
                qr: qrDataUrl,
                token,
                expiresInSeconds: 60,
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("tickets/qr API Fehler:", err);
        return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
    }
}