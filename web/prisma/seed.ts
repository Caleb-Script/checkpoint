// /Users/gentlebookpro/Projekte/checkpoint/web/prisma/seed.ts

import { PrismaClient, InvitationStatus, PresenceState } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Starte Seeder...");

    // --- Event ---
    const event = await prisma.event.create({
        data: {
            name: "Sommer Gala 2025",
            startsAt: new Date("2025-09-15T18:00:00Z"),
            endsAt: new Date("2025-09-16T02:00:00Z"),
            allowReEntry: true,
            rotateSeconds: 60,
        },
    });
    console.log(`📅 Event erstellt: ${event.name}`);

    // --- Seats ---
    const seats = await prisma.seat.createMany({
        data: Array.from({ length: 10 }).map((_, i) => ({
            eventId: event.id,
            section: "A",
            row: "1",
            number: (i + 1).toString(),
        })),
    });
    console.log(`💺 Seats erstellt: ${seats.count}`);

    // --- User (Keycloak IDs sind nur Platzhalter) ---
    const adminUser = await prisma.user.create({
        data: {
            keycloakId: "kc-admin-id",
            email: "admin@example.com",
            name: "Admin User",
            roles: ["admin"],
        },
    });

    const securityUser = await prisma.user.create({
        data: {
            keycloakId: "kc-security-id",
            email: "security@example.com",
            name: "Security User",
            roles: ["security"],
        },
    });

    const guestUser = await prisma.user.create({
        data: {
            keycloakId: "kc-guest-id",
            email: "guest@example.com",
            name: "Guest User",
            roles: ["guest"],
        },
    });

    console.log(`👥 Users erstellt: admin=${adminUser.id}, guest=${guestUser.id}`);

    // --- GuestProfile ---
    const guestProfile = await prisma.guestProfile.create({
        data: {
            primaryEmail: "guest@example.com",
            firstName: "Max",
            lastName: "Mustermann",
            userId: guestUser.id,
        },
    });

    // --- Invitation ---
    const invitation = await prisma.invitation.create({
        data: {
            eventId: event.id,
            guestProfileId: guestProfile.id,
            status: InvitationStatus.ACCEPTED,
            messageChannel: "whatsapp",
        },
    });

    // --- Ticket ---
    const ticket = await prisma.ticket.create({
        data: {
            eventId: event.id,
            invitationId: invitation.id,
            currentState: PresenceState.OUTSIDE,
            deviceBoundKey: "device-12345",
            revoked: false,
        },
    });

    console.log(`🎟️ Ticket erstellt: ${ticket.id}`);

    console.log("✅ Seeder abgeschlossen");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
