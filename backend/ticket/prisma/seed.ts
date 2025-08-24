import { PresenceState, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Tickets für akzeptierte Einladungen
  await prisma.ticket.create({
    data: {
      eventId: 'seed-sommer-gala-2025',
      invitationId: '00000000-0000-0000-0000-000000000000',
      seatId: 'A1',
      currentState: PresenceState.OUTSIDE,
      revoked: false,
    },
  });

  await prisma.ticket.create({
    data: {
      eventId: 'seed-sommer-gala-2025',
      invitationId: '00000000-0000-0000-0000-000000000001',
      seatId: 'A2',
      currentState: PresenceState.OUTSIDE,
      revoked: false,
    },
  });

  console.log('✅ Seeding done.');
}

main()
  .catch((e) => {
    console.error('Seed Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
