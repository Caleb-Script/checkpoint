import { PrismaClient, PresenceState } from "@prisma/client";
const prisma = new PrismaClient();

async function main(): Promise<void> {
    // assumes invitation ids exist; we can seed a dummy if needed
    await prisma.ticket.createMany({
        data: [
            { eventId: "event-a", invitationId: "inv-seed-1", currentState: PresenceState.OUTSIDE },
            { eventId: "event-a", invitationId: "inv-seed-2", currentState: PresenceState.OUTSIDE }
        ],
        skipDuplicates: true
    });
}

main().finally(() => prisma.$disconnect());
