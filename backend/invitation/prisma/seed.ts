import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const event = await prisma.invitation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000000' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000000',
      eventId: 'seed-sommer-gala-2025',
      guestProfileId: '61e4d86b-d227-4de5-9514-46c5d956b663',
        status: 'PENDING',
        rsvpChoice: null,
        maxInvitees: 2,
        invitedByInvitationId: null,
        approved: false,
    },
  });

  console.log('✅ Seed ok:', event.id);
}

main()
  .catch((e) => {
    console.error('Seed Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
