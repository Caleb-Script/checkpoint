// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/public/tickets/qr.png/route.ts
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { verifyToken } from "@/lib/claim";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get("token") || "";
    const v = verifyToken(token);
    if (!v.ok || v.data.kind !== "ticket") {
        return new NextResponse("invalid", { status: 401 });
    }

    // Optional: Ticket-Check (revoked etc.)
    const t = await prisma.ticket.findUnique({ where: { id: v.data.ticketId! } });
    if (!t || t.invitationId !== v.data.invitationId || t.revoked) {
        return new NextResponse("gone", { status: 410 });
    }

    // Inhalt des QR: du kannst direkt den Ticket-Link kodieren:
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const url = `${base}/ticket?claim=${encodeURIComponent(token)}`;

    const png = await QRCode.toBuffer(url, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 600,
        color: {
            dark: "#000000",
            light: "#FFFFFF"
        }
    });

    return new NextResponse(png, {
        status: 200,
        headers: {
            "Content-Type": "image/png",
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
        }
    });
}