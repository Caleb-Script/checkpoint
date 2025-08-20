import { PresenceState, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Tickets für akzeptierte Einladungen
  await prisma.ticket.create({
    data: {
      eventId: 'event 1',
      invitationId: 'inv 1',
      seatId: 'A1',
      currentState: PresenceState.OUTSIDE,
      revoked: false,
    },
  });

  await prisma.ticket.create({
    data: {
      eventId: 'event 1',
      invitationId: 'inv 2',
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
