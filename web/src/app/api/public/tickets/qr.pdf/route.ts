// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/public/tickets/qr.pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
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

    const t = await prisma.ticket.findUnique({
        where: { id: v.data.ticketId! },
        include: { event: true, invitation: { include: { guestProfile: true } } }
    });
    if (!t || t.invitationId !== v.data.invitationId || t.revoked) {
        return new NextResponse("gone", { status: 410 });
    }

    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const url = `${base}/ticket?claim=${encodeURIComponent(token)}`;
    const png = await QRCode.toBuffer(url, { errorCorrectionLevel: "M", margin: 1, width: 800 });

    // PDF erzeugen
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

    doc.fontSize(20).text(`Ticket – ${t.event.name}`, { align: "left" });
    doc.moveDown(0.5);
    const guest =
        `${t.invitation.guestProfile?.firstName ?? ""} ${t.invitation.guestProfile?.lastName ?? ""}`.trim() ||
        t.invitation.guestProfile?.primaryEmail ||
        t.invitation.guestProfile?.phone ||
        "Gast";
    doc.fontSize(12).fillColor("#555").text(guest);
    doc.moveDown(1);

    const x = (doc.page.width - 360) / 2;
    doc.image(png, x, doc.y, { width: 360 });
    doc.moveDown(1.5);

    doc.fontSize(10).fillColor("#777").text(url, { link: url, underline: true, align: "center" });

    doc.end();
    const pdf = await done;

    return new NextResponse(pdf, {
        status: 200,
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="ticket-${t.id}.pdf"`,
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
        }
    });
}