/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🚀 Starte Notification-Seed...');
  // assumes invitation ids exist; we can seed a dummy if needed
  // prisma/seed.ts (Auszug)
  await prisma.template.upsert({
    where: { key: 'sendUserCredentials' },
    update: {},
    create: {
      key: 'sendUserCredentials',
      title: 'Willkommen, {{firstName}}',
      body: 'Dein Benutzername: {{username}}\nDein Passwort: {{password}}\nBitte ändere dein Passwort nach dem Login.',
      variables: ['firstName', 'username', 'password'] as any,
      channel: 'IN_APP',
      category: 'ACCOUNT',
      isActive: true,
      version: 1,
      tags: ['credentials', 'onboarding'],
    },
  });

  console.log('✅ Notification-Seed abgeschlossen.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
