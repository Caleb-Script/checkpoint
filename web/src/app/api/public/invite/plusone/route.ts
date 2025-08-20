// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/public/invite/plusone/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GuestIn = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

const norm = (s?: string | null) =>
  s ? String(s).trim() || undefined : undefined;
const normPhone = (s?: string | null) =>
  s ? String(s).replace(/[^\d+]/g, "") || undefined : undefined;

/**
 * POST /api/public/invite/plusone
 * Body: { code: string, guests: GuestIn[] }  (oder { code, guest } single)
 * - legt Kinder-Einladungen PENDING an (kein shareCode)
 * - bearbeitbar/löschbar bis Ticket erstellt
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const code = String(body.code || "");
  const guests: GuestIn[] = Array.isArray(body.guests)
    ? body.guests
    : body.guest
      ? [body.guest]
      : [];
  if (!code)
    return NextResponse.json(
      { ok: false, error: "code required" },
      { status: 400 },
    );
  if (!guests.length)
    return NextResponse.json(
      { ok: false, error: "guests required" },
      { status: 400 },
    );

  const parent = await prisma.invitation.findUnique({
    where: { shareCode: code },
    include: { _count: { select: { invitedChildren: true } }, event: true },
  });
  if (!parent)
    return NextResponse.json(
      { ok: false, error: "invitation not found" },
      { status: 404 },
    );

  const max = parent.maxInvitees ?? 0;
  const usedBefore = parent._count.invitedChildren ?? 0;
  if (max <= 0)
    return NextResponse.json(
      { ok: false, error: "PLUS_ONES_DISABLED" },
      { status: 403 },
    );

  const remaining = Math.max(0, max - usedBefore);
  if (remaining <= 0)
    return NextResponse.json(
      { ok: false, error: "NO_SLOTS_LEFT" },
      { status: 409 },
    );

  const toCreate = guests.slice(0, remaining);

  const created: Array<{ id: string; guestProfileId: string }> = [];
  const rejected: Array<{ reason: string; index: number }> = [];

  for (let i = 0; i < toCreate.length; i++) {
    const g = toCreate[i];
    const hasAny = !!(
      g.firstName?.trim() ||
      g.lastName?.trim() ||
      g.email?.trim() ||
      g.phone?.trim()
    );
    if (!hasAny) {
      rejected.push({ reason: "empty_row", index: i });
      continue;
    }

    const email = norm(g.email);
    const phone = normPhone(g.phone);
    const firstName = norm(g.firstName);
    const lastName = norm(g.lastName);

    let gp = null as any;
    if (email)
      gp = await prisma.guestProfile.findFirst({
        where: { primaryEmail: email },
      });
    if (!gp && phone)
      gp = await prisma.guestProfile.findFirst({ where: { phone } });
    gp = gp
      ? await prisma.guestProfile.update({
          where: { id: gp.id },
          data: {
            primaryEmail: email ?? gp.primaryEmail,
            phone: phone ?? gp.phone,
            firstName: firstName ?? gp.firstName,
            lastName: lastName ?? gp.lastName,
          },
        })
      : await prisma.guestProfile.create({
          data: { primaryEmail: email, phone, firstName, lastName },
        });

    // Doppel vermeiden
    const exists = await prisma.invitation.findFirst({
      where: {
        eventId: parent.eventId,
        guestProfileId: gp.id,
        invitedByInvitationId: parent.id,
      },
    });
    if (exists) {
      created.push({ id: exists.id, guestProfileId: gp.id });
      continue;
    }

    const child = await prisma.invitation.create({
      data: {
        eventId: parent.eventId,
        guestProfileId: gp.id,
        invitedByInvitationId: parent.id,
        status: "PENDING",
        rsvpChoice: null,
        rsvpAt: null,
        shareCode: null,
      },
      select: { id: true, guestProfileId: true },
    });
    created.push(child);
  }

  return NextResponse.json({
    ok: true,
    summary: {
      attempted: guests.length,
      created: created.length,
      rejected,
      slots: {
        max,
        usedBefore,
        remaining: Math.max(0, max - (usedBefore + created.length)),
      },
    },
    children: created,
  });
}
