// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/public/invite/plusone/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const b = await req.json();
  const code = String(b.code || "");
  const id = String(b.id || "");
  const guest = b.guest || {};
  if (!code || !id)
    return NextResponse.json(
      { ok: false, error: "code and id required" },
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

  const child = await prisma.invitation.findUnique({
    where: { id },
    include: { guestProfile: true, ticket: true },
  });
  if (!child || child.invitedByInvitationId !== parent.id)
    return NextResponse.json(
      { ok: false, error: "not-your-plusone" },
      { status: 403 },
    );
  if (child.ticket)
    return NextResponse.json(
      { ok: false, error: "locked-by-ticket" },
      { status: 409 },
    );

  const data: any = {};
  if ("firstName" in guest)
    data.firstName = String(guest.firstName || "").trim() || null;
  if ("lastName" in guest)
    data.lastName = String(guest.lastName || "").trim() || null;
  if ("email" in guest)
    data.primaryEmail = String(guest.email || "").trim() || null;
  if ("phone" in guest)
    data.phone = String(guest.phone || "").replace(/[^\d+]/g, "") || null;

  const updated = await prisma.guestProfile.update({
    where: { id: child.guestProfileId },
    data,
  });
  return NextResponse.json({
    ok: true,
    guest: {
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.primaryEmail,
      phone: updated.phone,
    },
  });
}
