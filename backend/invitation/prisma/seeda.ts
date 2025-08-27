import { PrismaClient, InvitationStatus } from "@prisma/client";
const prisma = new PrismaClient();

async function main(): Promise<void> {
    // assumes event-a exists in Event DB; here we just seed invitations referencing it by id
    await prisma.invitation.createMany({
        data: [
            { eventId: "event-a", status: InvitationStatus.PENDING, maxInvitees: 2, shareCode: "INV-A-001" },
            { eventId: "event-a", status: InvitationStatus.PENDING, maxInvitees: 0, shareCode: "INV-A-002" }
        ],
        skipDuplicates: true
    });
}
main().finally(() => prisma.$disconnect());
