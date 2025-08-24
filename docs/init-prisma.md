# Init Prisma

``` bash
npm install -D prisma
npm install @prisma/client
mkdir -p prisma
```

```text
schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  DECLINED
  CANCELED
}

enum PresenceState {
  INSIDE
  OUTSIDE
}

model User {
  id             String   @id @default(cuid())
  keycloakId     String   @unique
  email          String?  @unique
  name           String?
  roles          String[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  guestProfiles  GuestProfile[]
  scanLogs       ScanLog[]
}

model Event {
  id            String    @id @default(cuid())
  name          String
  startsAt      DateTime
  endsAt        DateTime
  allowReEntry  Boolean   @default(true)
  rotateSeconds Int       @default(60)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  seats         Seat[]
  invitations   Invitation[]
  tickets       Ticket[]
  scanLogs      ScanLog[]
}

model Seat {
  id        String  @id @default(cuid())
  eventId   String
  section   String?
  row       String?
  number    String?
  note      String?

  event     Event   @relation(fields: [eventId], references: [id])
  ticket    Ticket?

  @@index([eventId])
}

model GuestProfile {
  id           String   @id @default(cuid())
  primaryEmail String?
  phone        String?
  firstName    String?
  lastName     String?
  userId       String?

  user         User?    @relation(fields: [userId], references: [id])
  invitations  Invitation[]
}

model Invitation {
  id             String            @id @default(cuid())
  eventId        String
  guestProfileId String
  status         InvitationStatus  @default(PENDING)
  messageChannel String?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  event          Event        @relation(fields: [eventId], references: [id])
  guestProfile   GuestProfile @relation(fields: [guestProfileId], references: [id])
  ticket         Ticket?

  @@index([eventId, status])
}

model Ticket {
  id             String        @id @default(cuid())
  eventId        String
  invitationId   String  @unique
  seatId         String? @unique
  currentState   PresenceState @default(OUTSIDE)
  deviceBoundKey String?
  revoked        Boolean       @default(false)
  lastRotatedAt  DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  event       Event       @relation(fields: [eventId], references: [id])
  invitation  Invitation  @relation(fields: [invitationId], references: [id])
  seat        Seat?       @relation(fields: [seatId], references: [id])
  scanLogs    ScanLog[]
  shareGuard  ShareGuard?

  @@index([eventId])
}

model ScanLog {
  id         String       @id @default(cuid())
  ticketId   String
  eventId    String
  byUserId   String?
  direction  PresenceState
  verdict    String
  gate       String?
  deviceHash String?
  createdAt  DateTime     @default(now())

  ticket Ticket @relation(fields: [ticketId], references: [id])
  event  Event  @relation(fields: [eventId], references: [id])
  byUser User?  @relation(fields: [byUserId], references: [id])

  @@index([eventId, createdAt])
}

model ShareGuard {
  id           String  @id @default(cuid())
  ticketId     String  @unique
  failCount    Int     @default(0)
  lastFailAt   DateTime?
  blockedUntil DateTime?
  reason       String?

  ticket       Ticket  @relation(fields: [ticketId], references: [id])
}

```

``` text
import { PrismaClient } from "@prisma/client";

/**
 * PrismaClient Singleton für Next.js (App Router).
 * Verhindert, dass bei Hot-Reload in Dev mehrfach Verbindungen geöffnet werden.
 *
 * WICHTIG:
 * - Nur in Server Components, Server Actions oder Route-Handlern importieren.
 * - Nicht in Client Components verwenden.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// In Dev im globalen Scope cachen
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

# Prisma Client generieren (liest DATABASE_URL aus deiner .env im Projektbaum)

``` bash
npx prisma generate
```

```bash
# (Falls noch nicht gemacht) erste Migration aus deinem Schema anlegen:
npx prisma migrate dev --name init
```

# INIT MULTI PRISMA SCHEMA

````bash
cd backend/event
pnpm install
npx prisma generate
npx prisma migrate dev --name init
cd ../..
# Invitation-Service
cd backend/invitation
pnpm install
npx prisma generate
npx prisma migrate dev --name init
cd ../..
# Ticket-Service
cd backend/ticket
pnpm install
npx prisma generate
npx prisma migrate dev --name init
cd ../..



docker compose down -v
rm -rf ../volumes/postgres/app/data
mkdir -p ../volumes/postgres/app/data
docker compose up -d
```