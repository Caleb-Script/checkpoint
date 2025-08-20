// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/admin/invitations/issue-ticket/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  createUser,
  findUserByUsernameOrEmail,
  setUserTempPassword,
} from "@/lib/keycloakAdmin";
import { signToken } from "@/lib/claim";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function genPassword(len = 10) {
  // gut tippbares Temp-Passwort, ohne ähnlich aussehende Zeichen
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/**
 * POST /api/admin/invitations/issue-ticket
 * Body: { invitationId?: string, shareCode?: string }
 *
 * Ablauf:
 *  - Holt Einladung (per id ODER shareCode)
 *  - Prüft Status (muss ACCEPTED sein)
 *  - Erzeugt Ticket (falls noch keins)
 *  - Erzeugt/aktualisiert Keycloak-User, setzt TEMP-Passwort
 *  - Baut Ticket-URL (mit signiertem Claim-Token) + PNG/PDF-QR-URLs
 *  - Baut wa.me-URL mit vorgefülltem Text (inkl. Zugangsdaten)
 */
export async function POST(req: NextRequest) {
  const b = await req.json();
  const invitationId = b?.invitationId ? String(b.invitationId) : undefined;
  const shareCode = b?.shareCode ? String(b.shareCode) : undefined;

  if (!invitationId && !shareCode) {
    return NextResponse.json(
      { ok: false, error: "invitationId or shareCode required" },
      { status: 400 },
    );
  }

  const inv = await prisma.invitation.findFirst({
    where: invitationId ? { id: invitationId } : { shareCode: shareCode! },
    include: { ticket: true, event: true, guestProfile: true, invitedBy: true },
  });
  if (!inv)
    return NextResponse.json(
      { ok: false, error: "invitation not found" },
      { status: 404 },
    );

  if (inv.status !== "ACCEPTED") {
    return NextResponse.json(
      { ok: false, error: "invitation-not-accepted" },
      { status: 409 },
    );
  }

  // Ticket anlegen (falls fehlt)
  const ticket =
    inv.ticket ??
    (await prisma.ticket.create({
      data: { eventId: inv.eventId, invitationId: inv.id },
    }));

  // ===== Account anlegen/aktualisieren (Keycloak) =====
  const email = inv.guestProfile?.primaryEmail?.trim().toLowerCase() || "";
  const phone = inv.guestProfile?.phone?.replace(/[^\d+]/g, "") || "";
  const fallbackUser = `guest-${inv.id.slice(0, 8)}`;
  const username = email || phone || fallbackUser;

  let kcId: string | null = null;
  const existing = await findUserByUsernameOrEmail(username);
  if (existing?.id) {
    kcId = existing.id;
  } else {
    const created = await createUser({
      email: email || `${fallbackUser}@no-mail.local`,
      username,
      firstName: inv.guestProfile?.firstName || "",
      lastName: inv.guestProfile?.lastName || "",
      phone: phone || undefined,
      emailVerified: false,
      enabled: true,
    });
    kcId = created.id;
  }

  // TEMP Passwort setzen (muss beim 1. Login geändert werden)
  const tempPassword = genPassword(10);
  await setUserTempPassword(kcId!, tempPassword);

  console.log("\n");
  console.log(
    "=========================NEW USER====================================",
  );
  console.log("User: " + username + " new Password: " + tempPassword);
  console.log(
    "=====================================================================",
  );
  console.log("\n");
  // Prisma-User verknüpfen (für interne Zuordnung)
  const displayName =
    `${inv.guestProfile?.firstName ?? ""} ${inv.guestProfile?.lastName ?? ""}`.trim();
  const user = await prisma.user.upsert({
    where: { keycloakId: kcId! },
    update: { email: email || null, name: displayName || null },
    create: {
      keycloakId: kcId!,
      email: email || null,
      name: displayName || null,
      roles: ["guest"],
    },
  });
  if (!inv.guestProfile?.userId) {
    await prisma.guestProfile.update({
      where: { id: inv.guestProfileId },
      data: { userId: user.id },
    });
  }

  // ===== Links bauen =====
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  // Signierter Token für Ticket-/QR-Endpunkte (Schutz vor Copy-Share)
  const claim = signToken(
    { kind: "ticket", invitationId: inv.id, ticketId: ticket.id },
    60 * 60 * 24 * 7,
  ); // 7 Tage
  const ticketUrl = `${base}/ticket?claim=${encodeURIComponent(claim)}`;

  // Diese Endpunkte hast du (oder bekommst du) unter:
  // /src/app/api/public/tickets/qr.png/route.ts  und  /src/app/api/public/tickets/qr.pdf/route.ts
  const pngUrl = `${base}/api/public/tickets/qr.png?token=${encodeURIComponent(claim)}`;
  const pdfUrl = `${base}/api/public/tickets/qr.pdf?token=${encodeURIComponent(claim)}`;

  // App-Links aus ENV (falls leer: Platzhalter)
  const appStore = process.env.APPSTORE_URL || "https://apps.apple.com/";
  const playStore = process.env.PLAYSTORE_URL || "https://play.google.com/";
  const webApp = base;

  // ===== WhatsApp-Text =====
  const waText =
    `🎟️ Dein Ticket für "${inv.event.name}"\n` +
    `Ticket öffnen: ${ticketUrl}\n\n` +
    `👤 Zugangsdaten\n` +
    `Benutzername: ${username}\n` +
    `Passwort: ${tempPassword} (beim ersten Login ändern)\n\n` +
    `📥 QR als PNG: ${pngUrl}\n` +
    `🖨️ QR als PDF: ${pdfUrl}\n\n` +
    `📲 iOS: ${appStore}\n` +
    `🤖 Android: ${playStore}\n` +
    `🌐 WebApp: ${webApp}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;

  return NextResponse.json({
    ok: true,
    invitation: { id: inv.id, name: displayName },
    account: { username, tempPassword },
    ticket: { id: ticket.id, url: ticketUrl, pngUrl, pdfUrl },
    whatsapp: { url: waUrl, text: waText },
  });
}
