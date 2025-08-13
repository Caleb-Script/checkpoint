// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/invitations/reject/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KC_CLIENT_ID = process.env.KC_CLIENT_ID || process.env.NEXT_PUBLIC_KC_CLIENT_ID || "checkpoint-guest";

function decodeJwt(token: string): any | null {
    try {
        const [, payload] = token.split(".");
        return payload ? JSON.parse(Buffer.from(payload, "base64").toString("utf-8")) : null;
    } catch {
        return null;
    }
}
function extractRoles(accessToken: string): string[] {
    const p = decodeJwt(accessToken) || {};
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

/**
 * POST /api/invitations/reject
 * Body: { invitationId: string, revokeTicket?: boolean }
 *
 * Wirkung:
 *  - approved=false, approvedAt=null, approvedById=null
 *  - status -> DECLINED
 *  - optional: Ticket revoked=true (und ggf. currentState=OUTSIDE)
 */
export async function POST(req: NextRequest) {
    const auth = ensureAuth(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));
    const invitationId = (body?.invitationId || "").trim();
    const revokeTicket = Boolean(body?.revokeTicket);

    if (!invitationId) {
        return NextResponse.json({ error: "invitationId fehlt" }, { status: 400 });
    }

    const inv = await prisma.invitation.findUnique({
        where: { id: invitationId },
        include: { ticket: true },
    });
    if (!inv) return NextResponse.json({ error: "Invitation nicht gefunden" }, { status: 404 });

    if (revokeTicket && inv.ticket) {
        await prisma.ticket.update({
            where: { id: inv.ticket.id },
            data: { revoked: true, currentState: "OUTSIDE" },
        });
    }

    const updated = await prisma.invitation.update({
        where: { id: inv.id },
        data: {
            approved: false,
            approvedAt: null,
            approvedById: null,
            status: "DECLINED",
        },
        include: {
            guestProfile: true,
            ticket: true,
            event: { select: { id: true, name: true } },
        },
    });

    return NextResponse.json({ ok: true, invitation: updated }, { status: 200 });
}