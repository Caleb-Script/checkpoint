// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/public/invite/plusone/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const b = await req.json();
    const code = String(b.code || "");
    const ids: string[] = Array.isArray(b.ids) ? b.ids : [];
    if (!code || !ids.length) return NextResponse.json({ ok: false, error: "code and ids required" }, { status: 400 });

    const parent = await prisma.invitation.findUnique({ where: { shareCode: code } });
    if (!parent) return NextResponse.json({ ok: false, error: "invitation not found" }, { status: 404 });

    const children = await prisma.invitation.findMany({ where: { id: { in: ids } }, include: { ticket: true } });

    const toAccept = children.filter(c => c.invitedByInvitationId === parent.id /* egal, ob bisher PENDING oder DECLINED */ && !c.ticket).map(c => c.id);
    if (!toAccept.length) return NextResponse.json({ ok: false, error: "nothing-to-accept" }, { status: 400 });

    const now = new Date();
    await prisma.invitation.updateMany({ where: { id: { in: toAccept } }, data: { status: "ACCEPTED", rsvpChoice: "YES", rsvpAt: now } });

    return NextResponse.json({ ok: true, accepted: toAccept.length });
}
