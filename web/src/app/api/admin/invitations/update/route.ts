// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/admin/invitations/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/invitations/update
 * Body: { invitationId?: string, shareCode?: string, maxInvitees?: number }
 * - aktualisiert maxInvitees für genau EINE Einladung
 */
export async function PATCH(req: NextRequest) {
  const b = await req.json();
  const id = b.invitationId ? String(b.invitationId) : undefined;
  const code = b.shareCode ? String(b.shareCode) : undefined;
  const maxInvitees = Number.isFinite(b.maxInvitees)
    ? Number(b.maxInvitees)
    : undefined;

  if (!id && !code)
    return NextResponse.json(
      { ok: false, error: "invitationId or shareCode required" },
      { status: 400 },
    );
  if (maxInvitees == null || maxInvitees < 0)
    return NextResponse.json(
      { ok: false, error: "maxInvitees >= 0 required" },
      { status: 400 },
    );

  const where = id ? { id } : { shareCode: code! };
  const updated = await prisma.invitation.update({
    where,
    data: { maxInvitees },
  });

  return NextResponse.json({
    ok: true,
    invitation: { id: updated.id, maxInvitees: updated.maxInvitees },
  });
}
