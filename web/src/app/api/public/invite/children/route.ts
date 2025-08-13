// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/public/invite/children/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code") || "";
    if (!code) return NextResponse.json({ ok: false, error: "code required" }, { status: 400 });

    const parent = await prisma.invitation.findUnique({ where: { shareCode: code } });
    if (!parent) return NextResponse.json({ ok: false, error: "invitation not found" }, { status: 404 });

    const list = await prisma.invitation.findMany({
        where: { invitedByInvitationId: parent.id },
        include: { guestProfile: true, ticket: true },
        orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
        ok: true,
        children: list.map(c => ({
            id: c.id,
            status: c.status,
            rsvpChoice: c.rsvpChoice,
            ticketIssued: !!c.ticket,
            guest: {
                firstName: c.guestProfile?.firstName ?? "",
                lastName: c.guestProfile?.lastName ?? "",
                email: c.guestProfile?.primaryEmail ?? "",
                phone: c.guestProfile?.phone ?? "",
            },
        })),
    });
}
