import { PresenceState, PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🚀 Starte Ticket-Seed...');
  // assumes invitation ids exist; we can seed a dummy if needed
  await prisma.ticket.createMany({
    data: [
      {
        eventId: 'event-a',
        invitationId: 'inv-seed-1',
        currentState: PresenceState.OUTSIDE,
        seatId: 'seat-demo-001',
      },
      {
        eventId: 'event-a',
        invitationId: 'inv-seed-2',
        currentState: PresenceState.OUTSIDE,
        seatId: 'seat-demo-002',
      },
    ],
    skipDuplicates: true,
  });

  // Beispiel Event/Invitation IDs – hier statisch
  // In der Realität würden die IDs aus Event/Invitation-Service kommen
  const eventId = 'event-a';
  const invitationId = 'inv-seed-3';

  // Ticket anlegen
  const ticket = await prisma.ticket.upsert({
    where: { invitationId },
    update: {},
    create: {
      eventId,
      invitationId,
      guestProfileId: '61e4d86b-d227-4de5-9514-46c5d956b663',
      seatId: 'seat-demo-003',
      currentState: PresenceState.OUTSIDE,
    },
  });
  console.log(`🎟️ Ticket angelegt: ${ticket.id}`);

  // ShareGuard sicherstellen
  await prisma.shareGuard.upsert({
    where: { ticketId: ticket.id },
    update: {},
    create: {
      ticketId: ticket.id,
      failCount: 0,
    },
  });

  // Ein paar ScanLogs schreiben
  await prisma.scanLog.createMany({
    data: [
      {
        ticketId: ticket.id,
        eventId: ticket.eventId,
        direction: PresenceState.INSIDE,
        verdict: 'OK',
        gate: 'Gate-A',
      },
      {
        ticketId: ticket.id,
        eventId: ticket.eventId,
        direction: PresenceState.OUTSIDE,
        verdict: 'OK',
        gate: 'Gate-A',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Ticket-Seed abgeschlossen.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
