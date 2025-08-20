// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/public/tickets/rotate/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, signToken } from "@/lib/claim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "");
  const v = verifyToken(token);
  if (!v.ok || v.data.kind !== "ticket") {
    return NextResponse.json(
      { ok: false, error: "invalid-token" },
      { status: 401 },
    );
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: v.data.ticketId! },
    include: { event: true },
  });
  if (!ticket || ticket.invitationId !== v.data.invitationId) {
    return NextResponse.json(
      { ok: false, error: "not-found" },
      { status: 404 },
    );
  }
  if (ticket.revoked) {
    return NextResponse.json({ ok: false, error: "revoked" }, { status: 410 });
  }

  const rotateSeconds = ticket.event.rotateSeconds ?? 60;

  // NEUEN kurzlebigen Claim signieren (nur für QR/Anzeige)
  const newToken = signToken(
    { kind: "ticket", invitationId: ticket.invitationId, ticketId: ticket.id },
    rotateSeconds,
  );

  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const pngUrl = `${base}/api/public/tickets/qr.png?token=${encodeURIComponent(newToken)}`;
  const pdfUrl = `${base}/api/public/tickets/qr.pdf?token=${encodeURIComponent(newToken)}`;

  const now = Math.floor(Date.now() / 1000);
  const exp = now + rotateSeconds;

  // Optional: Ticket.lastRotatedAt aktualisieren
  await prisma.ticket
    .update({
      where: { id: ticket.id },
      data: { lastRotatedAt: new Date() },
    })
    .catch(() => {
      /* best effort */
    });

  return NextResponse.json(
    {
      ok: true,
      token: { value: newToken, ttl: rotateSeconds, exp },
      media: { pngUrl, pdfUrl },
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
