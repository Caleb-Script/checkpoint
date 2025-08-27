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

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_shareCode_key" ON "public"."Invitation"("shareCode");

-- CreateIndex
CREATE INDEX "Invitation_eventId_status_idx" ON "public"."Invitation"("eventId", "status");

-- CreateIndex
CREATE INDEX "Invitation_eventId_rsvpChoice_idx" ON "public"."Invitation"("eventId", "rsvpChoice");

-- CreateIndex
CREATE INDEX "Invitation_invitedByInvitationId_idx" ON "public"."Invitation"("invitedByInvitationId");

-- CreateIndex
CREATE INDEX "Invitation_approved_approvedAt_idx" ON "public"."Invitation"("approved", "approvedAt");

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_invitedByInvitationId_fkey" FOREIGN KEY ("invitedByInvitationId") REFERENCES "public"."Invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
