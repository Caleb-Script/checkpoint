/*
  Warnings:

  - A unique constraint covering the columns `[guestProfileId]` on the table `Ticket` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Ticket" ADD COLUMN     "guestProfileId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_guestProfileId_key" ON "public"."Ticket"("guestProfileId");
