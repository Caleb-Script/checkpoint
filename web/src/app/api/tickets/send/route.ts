// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/tickets/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as QRCode from "qrcode";
import { createTicketJwt } from "@/lib/qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KC_CLIENT_ID =
    process.env.KC_CLIENT_ID || process.env.NEXT_PUBLIC_KC_CLIENT_ID || "checkpoint-guest";

function decodeJwt(token: string): any | null {
    try {
        const [, payload] = token.split(".");
        return payload ? JSON.parse(Buffer.from(payload, "base64").toString("utf-8")) : null;
    } catch {
        return null;
    }
}
function extractRoles(access: string): string[] {
    const p = decodeJwt(access) || {};
    const realm: string[] = p?.realm_access?.roles || [];
    const client: string[] = p?.resource_access?.[KC_CLIENT_ID]?.roles || [];
    return Array.from(new Set([...(realm || []), ...(client || [])]));
}
function ensureAuth(req: NextRequest) {
    const token = req.cookies.get("kc_access_token")?.value || "";
    if (!token) return { ok: false, status: 401, error: "Nicht eingeloggt" as const };
    const roles = extractRoles(token);
    if (!roles.includes("admin") && !roles.includes("security")) {
        return { ok: false, status: 403, error: "Keine Berechtigung" as const };
    }
    return { ok: true };
}

type SeatInput = { section?: string; row?: string; number?: string };
type Body = {
    invitationIds: string[];       // mehrere IDs
    seat?: SeatInput | null;       // optional Sitz-Override für ALLE
    webBaseUrl?: string;           // z.B. https://dein-host.tld
    profilePath?: string;          // Standard: /my-qr
    appStoreUrl?: string;          // optional
    playStoreUrl?: string;         // optional
    sendWhatsApp?: boolean;        // true => wa.me Link zurückgeben
    messageTemplate?: string;      // Platzhalter siehe unten
};
/**
 * Unterstützte {{Platzhalter}} im messageTemplate:
 *  - {{guestName}}, {{eventName}}, {{seat}}, {{imageUrl}}, {{profileUrl}}
 *  - {{appStoreUrl}}, {{playStoreUrl}}
 */
const DEFAULT_TEMPLATE =
    `Hallo {{guestName}}, dein Ticket für „{{eventName}}“ ist bereit 🎟️\n\n` +
    `Ticketbild: {{imageUrl}}\nProfil/QR: {{profileUrl}}\n` +
    `Sitz: {{seat}}\n\n` +
    `App iOS: {{appStoreUrl}}\nApp Android: {{playStoreUrl}}\n`;

function buildSeatText(seat?: { section?: string | null; row?: string | null; number?: string | null } | null) {
    if (!seat) return "–";
    return [seat.section, seat.row, seat.number].filter(Boolean).join(" ") || "–";
}
function renderTemplate(tpl: string, vars: Record<string, string>) {
    return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}
function makeWaLink(message: string, phone?: string | null) {
    const encoded = encodeURIComponent(message);
    if (phone) {
        const digits = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
        return `https://wa.me/${digits}?text=${encoded}`;
    }
    return `https://wa.me/?text=${encoded}`;
}

export async function POST(req: NextRequest) {
    const auth = ensureAuth(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const body = (await req.json().catch(() => ({}))) as Body;
        const ids = Array.isArray(body.invitationIds) ? body.invitationIds.filter(Boolean) : [];
        if (ids.length === 0) {
            return NextResponse.json({ error: "invitationIds ist leer" }, { status: 400 });
        }

        // Base URL (für Bild/Profil Links)
        let base = body.webBaseUrl || "";
        if (!base) {
            // Fallback aus Header (Origin)
            const origin = req.headers.get("origin") || req.headers.get("x-forwarded-host");
            if (origin) {
                base = origin.startsWith("http") ? origin : `https://${origin}`;
            }
        }
        if (!base) {
            return NextResponse.json({ error: "webBaseUrl fehlt (und Origin nicht verfügbar)" }, { status: 400 });
        }
        base = base.replace(/\/+$/, "");
        const profilePath = (body.profilePath || "/my-qr").replace(/^\/?/, "/");

        const seatOverride = body.seat || null;
        const appStoreUrl = body.appStoreUrl || "";
        const playStoreUrl = body.playStoreUrl || "";
        const messageTemplate = body.messageTemplate || DEFAULT_TEMPLATE;
        const sendWhatsApp = !!body.sendWhatsApp;

        // Alle Einladungen laden
        const invitations = await prisma.invitation.findMany({
            where: { id: { in: ids } },
            include: {
                event: true,
                guestProfile: true,
                ticket: { include: { seat: true } },
            },
        });

        const results: any[] = [];

        for (const inv of invitations) {
            if (!inv.event) {
                results.push({ invitationId: inv.id, ok: false, error: "Event fehlt" });
                continue;
            }

            // Muss freigegeben sein
            if (!inv.approved) {
                results.push({ invitationId: inv.id, ok: false, error: "Nicht freigegeben (approved=false)" });
                continue;
            }

            // Ticket sicherstellen
            // Optional: Sitz überschreiben/setzen
            let seatId: string | null = inv.ticket?.seatId ?? null;
            if (seatOverride && (seatOverride.section || seatOverride.row || seatOverride.number)) {
                const found = await prisma.seat.findFirst({
                    where: {
                        eventId: inv.eventId,
                        section: seatOverride.section || null,
                        row: seatOverride.row || null,
                        number: seatOverride.number || null,
                    },
                });
                const seat = found
                    ? found
                    : await prisma.seat.create({
                        data: {
                            eventId: inv.eventId,
                            section: seatOverride.section || null,
                            row: seatOverride.row || null,
                            number: seatOverride.number || null,
                        },
                    });
                seatId = seat.id;
            }

            let ticket = inv.ticket;
            if (!ticket) {
                ticket = await prisma.ticket.create({
                    data: {
                        eventId: inv.eventId,
                        invitationId: inv.id,
                        seatId,
                        currentState: "OUTSIDE",
                        revoked: false,
                    },
                    include: { seat: true },
                });
            } else if (seatId && ticket.seatId !== seatId) {
                ticket = await prisma.ticket.update({
                    where: { id: ticket.id },
                    data: { seatId },
                    include: { seat: true },
                });
            }

            // Token/QR fürs Profil (optional, falls du es brauchst)
            const token = await createTicketJwt(ticket.id, "IN", "send-api");
            const qrDataUrl = await QRCode.toDataURL(token, { margin: 1, width: 320 });

            // URLs
            const imageUrl = `${base}/api/tickets/image/${ticket.id}.png`;
            const profileUrl = `${base}${profilePath}?ticket=${encodeURIComponent(ticket.id)}`;

            // Nachricht
            const guestName =
                [inv.guestProfile?.firstName, inv.guestProfile?.lastName].filter(Boolean).join(" ") || "Gast";
            const seatText = buildSeatText(ticket.seat);

            const message = renderTemplate(messageTemplate, {
                guestName,
                eventName: inv.event.name,
                seat: seatText,
                imageUrl,
                profileUrl,
                appStoreUrl,
                playStoreUrl,
            });

            // Kostenloser WhatsApp-Link
            const wa = sendWhatsApp
                ? makeWaLink(message, inv.guestProfile?.phone || null)
                : makeWaLink(message); // nur Text, Empfänger wählt manuell

            results.push({
                invitationId: inv.id,
                ok: true,
                ticketId: ticket.id,
                imageUrl,
                profileUrl,
                waLink: wa,
                message,
                phone: inv.guestProfile?.phone || null,
            });
        }

        return NextResponse.json({ ok: true, results }, { status: 200 });
    } catch (e: any) {
        console.error("/api/tickets/send error:", e);
        return NextResponse.json({ ok: false, error: "Serverfehler" }, { status: 500 });
    }
}
