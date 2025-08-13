// /Users/gentlebookpro/Projekte/checkpoint/web/scripts/seed-demo.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // 1) Event
    const event = await prisma.event.upsert({
        where: { id: "evt_demo_1" },
        update: {},
        create: {
            id: "evt_demo_1",
            name: "Demo Gala 2025",
            startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            endsAt: new Date(Date.now() + 26 * 60 * 60 * 1000),
            allowReEntry: true,
            rotateSeconds: 60,
        },
    });

    // 2) Sitz
    const seat = await prisma.seat.create({
        data: {
            eventId: event.id,
            section: "A",
            row: "1",
            number: "12",
            note: "Front",
        },
    });

    // 3) Demo-User/GuestProfile
    // WICHTIG: passe keycloakId/email an einen echten Keycloak-User an!
    const keycloakId = "b807c313-ecd3-48fa-8731-14cd33a9c940"; // <- sub des Users aus Keycloak
    const email = "guest@omnixys.com";     // <- dessen E-Mail

    const user = await prisma.user.upsert({
        where: { keycloakId },
        update: { email },
        create: {
            keycloakId,
            email,
            name: "Demo Gast",
            roles: ["guest"],
        },
    });

    const gp = await prisma.guestProfile.upsert({
        where: { id: "gp_demo_1" },
        update: {},
        create: {
            id: "gp_demo_1",
            primaryEmail: email,
            firstName: "Demo",
            lastName: "Gast",
            userId: user.id,
        },
    });

    // 4) Einladung (ACCEPTED)
    const invitation = await prisma.invitation.create({
        data: {
            eventId: event.id,
            guestProfileId: gp.id,
            status: "ACCEPTED",
            messageChannel: "whatsapp",
        },
    });

    // 5) Ticket verknüpfen
    const ticket = await prisma.ticket.create({
        data: {
            eventId: event.id,
            invitationId: invitation.id,
            seatId: seat.id,
            currentState: "OUTSIDE",
            revoked: false,
        },
    });

    console.log("✅ Seed fertig:");
    console.log({ event, seat, user, gp, invitation, ticket });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });


