-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."PresenceState" AS ENUM ('INSIDE', 'OUTSIDE');

-- CreateEnum
CREATE TYPE "public"."RsvpChoice" AS ENUM ('YES', 'NO');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "keycloakId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "roles" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "allowReEntry" BOOLEAN NOT NULL DEFAULT true,
    "rotateSeconds" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Seat" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "section" TEXT,
    "row" TEXT,
    "number" TEXT,
    "note" TEXT,

    CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GuestProfile" (
    "id" TEXT NOT NULL,
    "primaryEmail" TEXT,
    "phone" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "userId" TEXT,

    CONSTRAINT "GuestProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invitation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestProfileId" TEXT NOT NULL,
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "messageChannel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rsvpChoice" "public"."RsvpChoice",
    "rsvpAt" TIMESTAMP(3),
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "maxInvitees" INTEGER NOT NULL DEFAULT 0,
    "invitedByInvitationId" TEXT,
    "shareCode" TEXT,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ticket" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "seatId" TEXT,
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
CREATE UNIQUE INDEX "User_keycloakId_key" ON "public"."User"("keycloakId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Seat_eventId_idx" ON "public"."Seat"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_shareCode_key" ON "public"."Invitation"("shareCode");

-- CreateIndex
CREATE INDEX "Invitation_eventId_status_idx" ON "public"."Invitation"("eventId", "status");

-- CreateIndex
CREATE INDEX "Invitation_eventId_rsvpChoice_idx" ON "public"."Invitation"("eventId", "rsvpChoice");

-- CreateIndex
CREATE INDEX "Invitation_approved_approvedAt_idx" ON "public"."Invitation"("approved", "approvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_invitationId_key" ON "public"."Ticket"("invitationId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_seatId_key" ON "public"."Ticket"("seatId");

-- CreateIndex
CREATE INDEX "Ticket_eventId_idx" ON "public"."Ticket"("eventId");

-- CreateIndex
CREATE INDEX "ScanLog_eventId_createdAt_idx" ON "public"."ScanLog"("eventId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShareGuard_ticketId_key" ON "public"."ShareGuard"("ticketId");

-- AddForeignKey
ALTER TABLE "public"."Seat" ADD CONSTRAINT "Seat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuestProfile" ADD CONSTRAINT "GuestProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_invitedByInvitationId_fkey" FOREIGN KEY ("invitedByInvitationId") REFERENCES "public"."Invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "public"."GuestProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "public"."Invitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "public"."Seat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScanLog" ADD CONSTRAINT "ScanLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScanLog" ADD CONSTRAINT "ScanLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScanLog" ADD CONSTRAINT "ScanLog_byUserId_fkey" FOREIGN KEY ("byUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShareGuard" ADD CONSTRAINT "ShareGuard_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
