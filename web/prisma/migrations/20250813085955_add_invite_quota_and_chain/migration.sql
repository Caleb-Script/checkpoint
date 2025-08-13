/*
  Warnings:

  - A unique constraint covering the columns `[shareCode]` on the table `Invitation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Invitation" ADD COLUMN     "invitedByInvitationId" TEXT,
ADD COLUMN     "maxInvitees" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shareCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_shareCode_key" ON "public"."Invitation"("shareCode");

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_invitedByInvitationId_fkey" FOREIGN KEY ("invitedByInvitationId") REFERENCES "public"."Invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
