// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/public/tickets/mint-qr/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/public/tickets/mint-qr
 * Body: { shareCode: string, direction?: "INSIDE"|"OUTSIDE", deviceId?: string, expSeconds?: number }
 * Antwort: { qrToken }
 * Keine Rolle nötig (Link-basiert über shareCode)
 */
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { shareCode, direction = "INSIDE", deviceId, expSeconds } = body || {};
    if (!shareCode) return NextResponse.json({ ok: false, error: "shareCode required" }, { status: 400 });

    const inv = await prisma.invitation.findUnique({ where: { shareCode }, include: { ticket: { include: { event: true } } } });
    if (!inv || !inv.ticket) return NextResponse.json({ ok: false, error: "ticket not found (not approved?)" }, { status: 404 });

    const rot = inv.ticket.event.rotateSeconds ?? 60;
    const ttl = Number(expSeconds ?? Math.max(60, Math.min(300, rot * 2)));

    const now = Math.floor(Date.now() / 1000);
    const payload: any = { ticketId: inv.ticket.id, eventId: inv.ticket.eventId, direction, iat: now, exp: now + ttl };
    if (deviceId) payload.deviceId = String(deviceId);

    const secret = process.env.QR_JWT_SECRET || process.env.JWT_SECRET || "dev-secret";
    const qrToken = jwt.sign(payload, secret);

    return NextResponse.json({ ok: true, qrToken, payload });
}
