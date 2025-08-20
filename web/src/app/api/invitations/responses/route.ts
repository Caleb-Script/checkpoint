// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/invitations/responses/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

type SortBy = "updatedAt" | "createdAt" | "status" | "eventName" | "guestName";

function getBearerToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization");
  if (!h) return null;
  const [type, token] = h.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

function hasSecurityRole(decoded: any): boolean {
  const roles: string[] = decoded?.realm_access?.roles || [];
  return roles.includes("admin") || roles.includes("security");
}

function normalizeStatus(s?: string | null) {
  if (!s) return undefined;
  const up = s.toUpperCase();
  return ["ACCEPTED", "DECLINED", "PENDING", "CANCELED"].includes(up)
    ? (up as "ACCEPTED" | "DECLINED" | "PENDING" | "CANCELED")
    : undefined;
}

export async function GET(req: NextRequest) {
  try {
    // AuthZ
    const bearer = getBearerToken(req);
    if (!bearer) {
      return NextResponse.json({ error: "Kein Auth-Token" }, { status: 401 });
    }
    let decoded: any;
    try {
      decoded = jwt.decode(bearer);
    } catch {
      return NextResponse.json({ error: "Token ungültig" }, { status: 401 });
    }
    if (!hasSecurityRole(decoded)) {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 },
      );
    }

    // Query params
    const { searchParams } = new URL(req.url);
    const status = normalizeStatus(searchParams.get("status"));
    const eventId = searchParams.get("eventId") || undefined;
    const search = (searchParams.get("search") || "").trim(); // Name/Email/Phone
    const sortBy = (searchParams.get("sortBy") as SortBy) || "updatedAt";
    const sortDirRaw = (searchParams.get("sortDir") || "desc").toLowerCase();
    const sortDir = sortDirRaw === "asc" ? "asc" : "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("pageSize") || "20", 10)),
    );
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Filter
    const where: any = {};
    if (status) where.status = status;
    if (eventId) where.eventId = eventId;
    if (search) {
      // Suche in GuestProfile (Name/Email/Phone)
      where.guestProfile = {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { primaryEmail: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    // Sortierung abbilden
    // Prisma sortiert nur über bekannte Felder; für eventName/guestName machen wir später ein Mapping per include + clientseitiger Sort,
    // hier vereinfachen wir: eventName/guestName -> sekundär sortieren nach updatedAt
    const orderBy: any[] = [];
    if (sortBy === "status") orderBy.push({ status: sortDir });
    else if (sortBy === "createdAt") orderBy.push({ createdAt: sortDir });
    else orderBy.push({ updatedAt: sortDir });

    const [total, invitations] = await Promise.all([
      prisma.invitation.count({ where }),
      prisma.invitation.findMany({
        where,
        include: {
          event: true,
          guestProfile: true,
          ticket: { include: { seat: true } },
        },
        orderBy,
        skip,
        take,
      }),
    ]);

    // Map fürs API-Response
    const items = invitations.map((inv) => {
      const gp = inv.guestProfile;
      const ticket = inv.ticket;
      const seat = ticket?.seat;
      const guestName =
        gp.firstName || gp.lastName
          ? `${gp.firstName ?? ""} ${gp.lastName ?? ""}`.trim()
          : (gp.primaryEmail ?? null);

      const seatNumber = seat
        ? `${seat.section || ""} ${seat.row || ""} ${seat.number || ""}`.trim() ||
          null
        : null;

      return {
        id: inv.id,
        status: inv.status,
        updatedAt: inv.updatedAt,
        createdAt: inv.createdAt,
        event: {
          id: inv.event.id,
          name: inv.event.name,
          startsAt: inv.event.startsAt,
          endsAt: inv.event.endsAt,
        },
        guest: {
          id: gp.id,
          firstName: gp.firstName,
          lastName: gp.lastName,
          email: gp.primaryEmail,
          phone: gp.phone,
          name: guestName,
        },
        ticket: ticket
          ? {
              id: ticket.id,
              currentState: ticket.currentState,
              seat: seat
                ? {
                    section: seat.section,
                    row: seat.row,
                    number: seat.number,
                    label: seatNumber,
                  }
                : null,
            }
          : null,
      };
    });

    return NextResponse.json({
      total,
      page,
      pageSize,
      items,
    });
  } catch (err) {
    console.error("API invitations/responses Fehler:", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
