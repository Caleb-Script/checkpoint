// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/scan/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { broadcastScanUpdate } from "@/lib/ws-server";

// ▶️ Node.js Runtime erzwingen (kein Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/scan
 * Body:
 * {
 *   qrToken: string,                // signiertes QR-JWT (ticketId, eventId, direction, deviceId?, exp)
 *   gate?: string                   // optional: Name des Gates/Checkpoints
 * }
 *
 * Auth: Cookie-basierte Session (kc_access_token). Erlaubte Rollen: "security" oder "admin".
 */

const QR_SECRET = process.env.QR_JWT_SECRET || process.env.JWT_SECRET || "dev-secret";
const KC_CLIENT_ID = process.env.KC_CLIENT_ID || process.env.NEXT_PUBLIC_KC_CLIENT_ID || "checkpoint-guest";

type ScanPayload = {
    ticketId: string;
    eventId: string;
    deviceId?: string;
    direction: "INSIDE" | "OUTSIDE";
    iat?: number;
    exp?: number;
};

function extractRolesFromJwt(accessToken: string): string[] {
    try {
        const [, payloadB64] = accessToken.split(".");
        const json = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8"));
        const realmRoles: string[] = json?.realm_access?.roles || [];
        const clientRoles: string[] = json?.resource_access?.[KC_CLIENT_ID]?.roles || [];
        return Array.from(new Set([...(realmRoles || []), ...(clientRoles || [])]));
    } catch {
        return [];
    }
}

async function findUserIdFromJwt(accessToken: string): Promise<string | null> {
    try {
        const [, payloadB64] = accessToken.split(".");
        const json = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8"));
        const kcSub: string | undefined = json?.sub;
        const email: string | undefined = json?.email;

        if (kcSub) {
            const user = await prisma.user.findUnique({ where: { keycloakId: kcSub }, select: { id: true } });
            if (user) return user.id;
        }
        if (email) {
            const user = await prisma.user.findFirst({ where: { email: email.toLowerCase() }, select: { id: true } });
            if (user) return user.id;
        }
        return null;
    } catch {
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        // 1) Session prüfen
        const accessToken = req.cookies.get("kc_access_token")?.value || null;
        if (!accessToken) {
            return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
        }

        // 2) Rollen prüfen
        const roles = extractRolesFromJwt(accessToken);
        const allowed = roles.includes("security") || roles.includes("admin");
        if (!allowed) {
            return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
        }

        // 3) Body / QR-Token lesen
        const body = await req.json().catch(() => null);
        const qrToken: string | undefined = body?.qrToken;
        const gate: string = body?.gate || "main";
        if (!qrToken) {
            return NextResponse.json({ error: "Kein QR-Token übermittelt" }, { status: 400 });
        }

        let decoded: ScanPayload;
        try {
            decoded = jwt.verify(qrToken, QR_SECRET) as ScanPayload; // prüft exp automatisch
        } catch (err) {
            return NextResponse.json({ error: "Ungültiger oder abgelaufener QR-Code" }, { status: 401 });
        }

        // 4) Ticket & Event laden
        const ticket = await prisma.ticket.findUnique({
            where: { id: decoded.ticketId },
            include: { event: true, invitation: true },
        });
        if (!ticket) {
            return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 });
        }
        if (ticket.revoked) {
            return NextResponse.json({ error: "Ticket wurde widerrufen" }, { status: 403 });
        }
        if (ticket.eventId !== decoded.eventId) {
            return NextResponse.json({ error: "Ticket gehört nicht zu diesem Event" }, { status: 403 });
        }
        const event = ticket.event;
        if (!event) {
            return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
        }

        // 5) Zustandsübergang bestimmen
        let newState = ticket.currentState;

        console.log(decoded.direction)
        if (decoded.direction === "INSIDE") {
            if (ticket.currentState === "INSIDE") {
                return NextResponse.json({ error: "Person ist bereits drinnen" }, { status: 409 });
            }
            newState = "INSIDE";
        } else {
            // "OUT"
            if (ticket.currentState === "OUTSIDE") {
                return NextResponse.json({ error: "Person ist bereits draußen" }, { status: 409 });
            }
            // Optional: Falls kein Re-Entry erlaubt, nur Auslass zulassen (Einlass später blockieren)
            newState = "OUTSIDE";
        }

        // 6) Ticket aktualisieren
        await prisma.ticket.update({
            where: { id: ticket.id },
            data: { currentState: newState },
        });

        // 7) ScanLog erfassen
        const byUserId = await findUserIdFromJwt(accessToken);
        const scanLog = await prisma.scanLog.create({
            data: {
                ticketId: ticket.id,
                eventId: ticket.eventId,
                byUserId,
                direction: newState === "INSIDE" ? "INSIDE" : "OUTSIDE",
                verdict: "OK",
                gate,
                deviceHash: decoded.deviceId || null,
            },
        });

        // 8) Broadcast (falls WS-Server aktiv)
        try {
            broadcastScanUpdate({
                id: scanLog.id,
                ticketId: scanLog.ticketId,
                eventId: scanLog.eventId,
                direction: scanLog.direction,
                verdict: scanLog.verdict,
                gate: scanLog.gate,
                createdAt: scanLog.createdAt,
            });
        } catch (e) {
            // WS optional – keine harte Fehlermeldung
            console.warn("WS broadcast failed:", e);
        }

        return NextResponse.json({
            success: true,
            message: `Ticket aktualisiert: ${newState}`,
            ticketId: ticket.id,
            state: newState,
        });
    } catch (err) {
        console.error("SCAN API Fehler:", err);
        return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
    }
}