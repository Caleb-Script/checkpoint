// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/public/invite/plusone/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  const b = await req.json();
  const code = String(b.code || "");
  const ids: string[] = Array.isArray(b.ids) ? b.ids : [];
  if (!code || !ids.length)
    return NextResponse.json(
      { ok: false, error: "code and ids required" },
      { status: 400 },
    );

  const parent = await prisma.invitation.findUnique({
    where: { shareCode: code },
  });
  if (!parent)
    return NextResponse.json(
      { ok: false, error: "invitation not found" },
      { status: 404 },
    );

  // Nur solche Kinder löschen, die keine Tickets haben
  const children = await prisma.invitation.findMany({
    where: { id: { in: ids } },
    include: { ticket: true },
  });
  const deletable = children
    .filter((c) => c.invitedByInvitationId === parent.id && !c.ticket)
    .map((c) => c.id);
  if (!deletable.length)
    return NextResponse.json(
      { ok: false, error: "nothing-deletable" },
      { status: 400 },
    );

  await prisma.invitation.deleteMany({ where: { id: { in: deletable } } });
  return NextResponse.json({ ok: true, deleted: deletable.length });
}
