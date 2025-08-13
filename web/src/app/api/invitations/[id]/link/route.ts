// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/invitations/[id]/link/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signRsvpToken } from "@/lib/rsvp";

function getOrigin(req: NextRequest) {
    // Versuche echte Origin zu bekommen, fallback auf ENV
    const fromHeader = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = (req.headers.get("x-forwarded-proto") || "http").split(",")[0].trim();
    const envOrigin = process.env.APP_ORIGIN;
    if (envOrigin) return envOrigin;
    if (fromHeader) return `${proto}://${fromHeader}`;
    return "http://localhost:3000";
}

/**
 * GET /api/invitations/:id/link?canInvite=2
 * Antwort: { url, token, expiresIn }
 */
export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
    try {
        const { id } = ctx.params;
        const urlObj = new URL(req.url);
        const canInviteParam = urlObj.searchParams.get("canInvite");
        const canInvite = canInviteParam ? parseInt(canInviteParam, 10) : undefined;

        const inv = await prisma.invitation.findUnique({
            where: { id },
            include: { event: true },
        });
        if (!inv) {
            return NextResponse.json({ error: "Invitation nicht gefunden" }, { status: 404 });
        }

        const token = signRsvpToken(
            { invitationId: inv.id, eventId: inv.eventId, canInvite },
            "14d"
        );

        const base = getOrigin(req);
        const url = `${base}/rsvp?t=${encodeURIComponent(token)}`;

        return NextResponse.json({ url, token, expiresIn: "14d" });
    } catch (err) {
        console.error("link generation failed", err);
        return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
    }
}