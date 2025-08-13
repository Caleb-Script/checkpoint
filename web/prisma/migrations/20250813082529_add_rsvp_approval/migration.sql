-- CreateEnum
CREATE TYPE "public"."RsvpChoice" AS ENUM ('YES', 'NO');

-- AlterTable
ALTER TABLE "public"."Invitation" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "rsvpAt" TIMESTAMP(3),
ADD COLUMN     "rsvpChoice" "public"."RsvpChoice";

-- CreateIndex
CREATE INDEX "Invitation_eventId_rsvpChoice_idx" ON "public"."Invitation"("eventId", "rsvpChoice");

-- CreateIndex
CREATE INDEX "Invitation_approved_approvedAt_idx" ON "public"."Invitation"("approved", "approvedAt");

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
