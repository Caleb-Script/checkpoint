import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const event = await prisma.event.upsert({
    where: { id: 'seed-sommer-gala-2025' },
    update: {},
    create: {
      id: 'seed-sommer-gala-2025',
      name: 'Sommer Gala 2025',
      startsAt: new Date('2025-08-30T18:00:00.000Z'),
      endsAt: new Date('2025-08-31T01:00:00.000Z'),
      maxSeats: 150,
      allowReEntry: true,
      rotateSeconds: 450,
    },
  });

  await prisma.seat.createMany({
    data: Array.from({ length: 20 }).map((_, i) => ({
      eventId: event.id,
      section: 'A',
      table: '1',
      number: String(i + 1),
    })),
    skipDuplicates: true,
  });

  console.log('✅ Seed ok:', event.name);
}

main()
  .catch((e) => {
    console.error('Seed Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
