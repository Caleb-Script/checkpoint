// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/admin/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Optional: In PROD via Keycloak prüfen. Für DEV kannst du hier testweise Header x-role: admin verlangen.
function devRequireAdmin(req: NextRequest) {
  const role = req.headers.get("x-role")?.toLowerCase();
  return role === "admin";
}

/**
 * GET /api/admin/events
 */
export async function GET(req: NextRequest) {
  // if (!devRequireAdmin(req)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const events = await prisma.event.findMany({
    orderBy: { startsAt: "desc" },
  });
  return NextResponse.json({ ok: true, events });
}

/**
 * POST /api/admin/events
 * Body: { name: string, startsAt: string(ISO/datetime-local), endsAt: string, allowReEntry?: boolean, rotateSeconds?: number }
 */
export async function POST(req: NextRequest) {
  // if (!devRequireAdmin(req)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const b = await req.json();
  if (!b?.name || !b?.startsAt || !b?.endsAt) {
    return NextResponse.json(
      { ok: false, error: "name/startsAt/endsAt required" },
      { status: 400 },
    );
  }
  const event = await prisma.event.create({
    data: {
      name: String(b.name),
      startsAt: new Date(b.startsAt),
      endsAt: new Date(b.endsAt),
      allowReEntry: b.allowReEntry ?? true,
      rotateSeconds: b.rotateSeconds ?? 60,
    },
  });
  return NextResponse.json({ ok: true, event }, { status: 201 });
}
