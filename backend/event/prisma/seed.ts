import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main(): Promise<void> {
    const e = await prisma.event.upsert({
        where: { id: "event-a" },
        update: {},
        create: {
            id: "event-a",
            name: "Checkpoint Launch Night",
            startsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
            endsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000 + 4 * 3600 * 1000)
        }
    });

    await prisma.seat.createMany({
        data: Array.from({ length: 20 }).map((_, i) => ({
            eventId: e.id,
            section: "A",
            table: "T1",
            number: String(i + 1)
        })),
        skipDuplicates: true
    });
}

main().finally(() => prisma.$disconnect());
