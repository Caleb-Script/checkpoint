// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/invitations/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ▶️ Node.js Runtime (kein Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/invitations/import
 *
 * Body:
 * {
 *   "eventId": "evt_123",
 *   "rows": [
 *     {
 *       "firstName": "Max",
 *       "lastName": "Mustermann",
 *       "email": "max@example.com",
 *       "phone": "+49171234567",
 *       "seatSection": "A",
 *       "seatRow": "1",
 *       "seatNumber": "12"
 *     }
 *   ],
 *   "options": {
 *     "createTicket": true,
 *     "sendWhatsApp": true,                  // ➜ erzeugt immer nur wa.me-Links (kostenlos)
 *     "webUrlBase": "https://deine-domain.tld",
 *     "appStoreUrl": "https://apps.apple.com/de/app/...",
 *     "includeAppStore": false,
 *     "messageTemplate": "Hallo {{firstName}} {{lastName}} ...",
 *     "eventName": "Sommer Gala 2025"
 *   }
 * }
 *
 * Auth: Cookie-basierte Session (kc_access_token), Rollen: admin | security
 *
 * Rückgabe:
 *  {
 *    ok: true,
 *    results: [
 *      {
 *        rowIndex,
 *        guestProfileId, invitationId, ticketId, seatId,
 *        whatsapp: { mode: "link", status: "sent"|"skipped", link?: string, message?: string, reason?: string }
 *      }
 *    ]
 *  }
 */

type ImportRow = {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    seatSection?: string;
    seatRow?: string;
    seatNumber?: string;
};

type ImportOptions = {
    createTicket?: boolean;
    sendWhatsApp?: boolean;
    webUrlBase?: string;
    appStoreUrl?: string;
    includeAppStore?: boolean;
    messageTemplate?: string;
    eventName?: string;
};

const DEFAULT_TEMPLATE =
    'Hallo {{firstName}} {{lastName}}, du bist zur "{{eventName}}" eingeladen 🎉\n\nBitte vervollständige (oder bestätige) deine Angaben und sieh deinen QR‑Einlasscode in der App/WebApp:\n\nWeb: {{link}}\n{{appPart}}\n\nDein Platz: {{seat}}\nBis bald!';

const KC_CLIENT_ID = process.env.KC_CLIENT_ID || process.env.NEXT_PUBLIC_KC_CLIENT_ID || "checkpoint-guest";

function decodeJwt(token: string): any | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        return JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    } catch {
        return null;
    }
}

function extractRoles(token: string): string[] {
    const payload = decodeJwt(token) || {};
    const realmRoles: string[] = payload?.realm_access?.roles || [];
    const clientRoles: string[] = payload?.resource_access?.[KC_CLIENT_ID]?.roles || [];
    return Array.from(new Set([...(realmRoles || []), ...(clientRoles || [])]));
}

function ensureAuth(req: NextRequest) {
    const accessToken = req.cookies.get("kc_access_token")?.value || null;
    if (!accessToken) return { ok: false, status: 401, error: "Nicht eingeloggt" as const };
    const roles = extractRoles(accessToken);
    const allowed = roles.includes("admin") || roles.includes("security");
    if (!allowed) return { ok: false, status: 403, error: "Keine Berechtigung" as const };
    return { ok: true };
}

function seatLabel(r: ImportRow) {
    const seg = [r.seatSection, r.seatRow, r.seatNumber].filter(Boolean).join(" ");
    return seg || "-";
}

function personalLink(base: string, row: ImportRow, eventName: string) {
    const u = new URL(base.replace(/\/+$/, "") + "/rsvp");
    if (row.email) u.searchParams.set("email", row.email);
    if (row.firstName) u.searchParams.set("first", row.firstName);
    if (row.lastName) u.searchParams.set("last", row.lastName);
    if (eventName) u.searchParams.set("event", eventName);
    return u.toString();
}

function renderMessage(tpl: string, vars: Record<string, string>) {
    return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ""));
}

/** Nur kostenloser Link‑Modus (wa.me). */
function makeWaLink(message: string, phone?: string | null) {
    const text = encodeURIComponent(message);
    if (phone) {
        // E.164 -> nur Ziffern (und führendes +) für wa.me/<number>
        const digits = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
        return `https://wa.me/${digits}?text=${text}`;
    }
    return `https://wa.me/?text=${text}`;
}

export async function POST(req: NextRequest) {
    try {
        // Auth
        const auth = ensureAuth(req);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const json = (await req.json().catch(() => ({}))) as {
            eventId?: string;
            rows?: ImportRow[];
            options?: ImportOptions;
        };

        const eventId = json.eventId?.trim();
        if (!eventId) {
            return NextResponse.json({ error: "eventId ist erforderlich" }, { status: 400 });
        }

        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) {
            return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
        }

        const rows = Array.isArray(json.rows) ? json.rows : [];
        if (rows.length === 0) {
            return NextResponse.json({ error: "rows ist leer" }, { status: 400 });
        }

        const opts: ImportOptions = {
            createTicket: json.options?.createTicket ?? true,
            sendWhatsApp: json.options?.sendWhatsApp ?? false,
            webUrlBase: json.options?.webUrlBase || "",
            appStoreUrl: json.options?.appStoreUrl || "",
            includeAppStore: json.options?.includeAppStore ?? false,
            messageTemplate: json.options?.messageTemplate || DEFAULT_TEMPLATE,
            eventName: json.options?.eventName || event.name,
        };

        if (!opts.webUrlBase) {
            opts.webUrlBase = process.env.NEXT_PUBLIC_BASE_URL || "";
        }

        const results: any[] = [];

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];

            if (!r.email && !r.phone) {
                results.push({ rowIndex: i, error: "Weder email noch phone vorhanden – übersprungen" });
                continue;
            }

            // 1) GuestProfile holen/erstellen
            const email = r.email?.toLowerCase().trim() || null;
            const phone = r.phone?.trim() || null;

            let guest = await prisma.guestProfile.findFirst({
                where: {
                    OR: [
                        email ? { primaryEmail: email } : { id: "__no__" },
                        phone ? { phone } : { id: "__no__" },
                    ],
                },
            });

            if (!guest) {
                guest = await prisma.guestProfile.create({
                    data: {
                        primaryEmail: email,
                        phone: phone,
                        firstName: r.firstName || null,
                        lastName: r.lastName || null,
                    },
                });
            } else {
                const needUpdate =
                    (r.firstName && r.firstName !== guest.firstName) ||
                    (r.lastName && r.lastName !== guest.lastName);
                if (needUpdate) {
                    guest = await prisma.guestProfile.update({
                        where: { id: guest.id },
                        data: {
                            firstName: r.firstName || guest.firstName,
                            lastName: r.lastName || guest.lastName,
                        },
                    });
                }
            }

            // 2) Seat finden/erstellen
            let seatId: string | null = null;
            if (r.seatSection || r.seatRow || r.seatNumber) {
                let seat = await prisma.seat.findFirst({
                    where: {
                        eventId,
                        section: r.seatSection || null,
                        row: r.seatRow || null,
                        number: r.seatNumber || null,
                    },
                });
                if (!seat) {
                    seat = await prisma.seat.create({
                        data: {
                            eventId,
                            section: r.seatSection || null,
                            row: r.seatRow || null,
                            number: r.seatNumber || null,
                            note: null,
                        },
                    });
                }
                seatId = seat.id;
            }

            // 3) Invitation erstellen/holen
            let invitation = await prisma.invitation.findFirst({
                where: { eventId, guestProfileId: guest.id },
                orderBy: [{ createdAt: "desc" }],
            });

            if (!invitation) {
                invitation = await prisma.invitation.create({
                    data: {
                        eventId,
                        guestProfileId: guest.id,
                        status: "PENDING",
                        messageChannel: "whatsapp",
                    },
                });
            }

            // 4) Ticket optional
            let ticket = await prisma.ticket.findFirst({
                where: { eventId, invitationId: invitation.id },
            });

            if (!ticket && opts.createTicket) {
                ticket = await prisma.ticket.create({
                    data: {
                        eventId,
                        invitationId: invitation.id,
                        seatId: seatId || null,
                        currentState: "OUTSIDE",
                        revoked: false,
                    },
                });
            } else if (ticket && seatId && ticket.seatId !== seatId) {
                ticket = await prisma.ticket.update({
                    where: { id: ticket.id },
                    data: { seatId },
                });
            }

            // 5) WhatsApp-Link immer kostenlos (wa.me)
            let wa:
                | { mode: "link"; status: "sent"; link: string; message: string }
                | { mode: "link"; status: "skipped"; reason: string } = {
                mode: "link",
                status: "skipped",
                reason: "sendWhatsApp=false",
            };

            try {
                const link = personalLink(opts.webUrlBase || "", r, opts.eventName || event.name);
                const appPart =
                    opts.includeAppStore && opts.appStoreUrl ? `App (optional): ${opts.appStoreUrl}` : "";
                const seat = seatLabel(r);

                const message = renderMessage(opts.messageTemplate || DEFAULT_TEMPLATE, {
                    firstName: r.firstName || "",
                    lastName: r.lastName || "",
                    eventName: opts.eventName || event.name,
                    link,
                    appPart,
                    seat,
                });

                // Falls sendWhatsApp=true → gib den konkreten wa.me-Link zurück
                if (opts.sendWhatsApp) {
                    const waLink = makeWaLink(message, phone);
                    wa = { mode: "link", status: "sent", link: waLink, message };
                } else {
                    // Auch bei false geben wir einen Link zurück, aber als "skipped" markiert (kein Autoversand)
                    const waLink = makeWaLink(message, phone);
                    wa = { mode: "link", status: "skipped", reason: "Nur Link erzeugt", };
                    // Wenn du lieber den Link trotzdem sehen willst, ersetze die Zeile oben durch:
                    // wa = { mode: "link", status: "skipped", reason: "Nur Link erzeugt", link: waLink, message };
                }
            } catch (e: any) {
                wa = { mode: "link", status: "skipped", reason: `Fehler beim Linkbau: ${String(e?.message || e)}` };
            }

            results.push({
                rowIndex: i,
                guestProfileId: guest.id,
                invitationId: invitation.id,
                ticketId: ticket?.id || null,
                seatId,
                whatsapp: wa,
            });
        }

        return NextResponse.json({ ok: true, results }, { status: 200 });
    } catch (err) {
        console.error("/api/invitations/import error:", err);
        return NextResponse.json({ ok: false, error: "Serverfehler" }, { status: 500 });
    }
}