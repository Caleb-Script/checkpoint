// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/tickets/image/[ticketId].png/route.ts
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { renderTicketPng } from "@/lib/ticketImage";
import * as QRCode from "qrcode";
import { createTicketJwt } from "@/lib/qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { ticketId: string } };

export async function GET(req: NextRequest, { params }: Params) {
    try {
        const ticketId = params.ticketId;
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                invitation: { include: { guestProfile: true, event: true } },
                seat: true,
                event: true,
            },
        });

        if (!ticket) {
            return new Response("Not found", { status: 404 });
        }

        const event = ticket.event || ticket.invitation?.event;
        const guest = ticket.invitation?.guestProfile;

        const guestName = [guest?.firstName, guest?.lastName].filter(Boolean).join(" ") || "Gast";
        const seatText = ticket.seat
            ? [ticket.seat.section, ticket.seat.row, ticket.seat.number].filter(Boolean).join(" ")
            : null;

        // Token (Richtung: IN) – der QR in der Bilddatei enthält das signierte JWT
        const token = await createTicketJwt(ticket.id, "IN", "ticket-image");

        // QR als Data-URL
        const qrDataUrl = await QRCode.toDataURL(token, { margin: 1, width: 720 });

        // Optionales Datum (schön fürs Bild)
        const dateText = event?.startsAt
            ? new Date(event.startsAt).toLocaleString("de-DE", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            })
            : null;

        const png = await renderTicketPng({
            eventName: event?.name || "Event",
            guestName,
            seatText,
            dateText,
            qrDataUrl,
        });

        return new Response(png, {
            status: 200,
            headers: {
                "Content-Type": "image/png",
                // Kein langes Caching, Bild kann sich (z. B. Sitz) ändern
                "Cache-Control": "no-store",
            },
        });
    } catch (e: any) {
        console.error("ticket image error:", e);
        return new Response("Server error", { status: 500 });
    }
}
