-- CreateEnum
CREATE TYPE "public"."PresenceState" AS ENUM ('INSIDE', 'OUTSIDE');

-- CreateTable
CREATE TABLE "public"."Ticket" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "seatId" TEXT,
    "guestProfileId" TEXT,
    "currentState" "public"."PresenceState" NOT NULL DEFAULT 'OUTSIDE',
    "deviceBoundKey" TEXT,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "lastRotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScanLog" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "byUserId" TEXT,
    "direction" "public"."PresenceState" NOT NULL,
    "verdict" TEXT NOT NULL,
    "gate" TEXT,
    "deviceHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShareGuard" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailAt" TIMESTAMP(3),
    "blockedUntil" TIMESTAMP(3),
    "reason" TEXT,

    CONSTRAINT "ShareGuard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_invitationId_key" ON "public"."Ticket"("invitationId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_seatId_key" ON "public"."Ticket"("seatId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_guestProfileId_key" ON "public"."Ticket"("guestProfileId");

-- CreateIndex
CREATE INDEX "Ticket_eventId_idx" ON "public"."Ticket"("eventId");

-- CreateIndex
CREATE INDEX "ScanLog_eventId_createdAt_idx" ON "public"."ScanLog"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "ScanLog_ticketId_idx" ON "public"."ScanLog"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareGuard_ticketId_key" ON "public"."ShareGuard"("ticketId");

-- AddForeignKey
ALTER TABLE "public"."ScanLog" ADD CONSTRAINT "ScanLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShareGuard" ADD CONSTRAINT "ShareGuard_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
