-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."RsvpChoice" AS ENUM ('YES', 'NO');

-- CreateTable
CREATE TABLE "public"."Invitation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestProfileId" TEXT,
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "rsvpChoice" "public"."RsvpChoice",
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "maxInvitees" INTEGER NOT NULL DEFAULT 0,
    "invitedByInvitationId" TEXT,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invitation_eventId_status_idx" ON "public"."Invitation"("eventId", "status");

-- CreateIndex
CREATE INDEX "Invitation_eventId_rsvpChoice_idx" ON "public"."Invitation"("eventId", "rsvpChoice");
