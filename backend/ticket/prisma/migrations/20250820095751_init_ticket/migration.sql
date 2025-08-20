/*
  Warnings:

  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GuestProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Invitation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ScanLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Seat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShareGuard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."GuestProfile" DROP CONSTRAINT "GuestProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Invitation" DROP CONSTRAINT "Invitation_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."Invitation" DROP CONSTRAINT "Invitation_eventId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Invitation" DROP CONSTRAINT "Invitation_guestProfileId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Invitation" DROP CONSTRAINT "Invitation_invitedByInvitationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ScanLog" DROP CONSTRAINT "ScanLog_byUserId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ScanLog" DROP CONSTRAINT "ScanLog_eventId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ScanLog" DROP CONSTRAINT "ScanLog_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Seat" DROP CONSTRAINT "Seat_eventId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ShareGuard" DROP CONSTRAINT "ShareGuard_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ticket" DROP CONSTRAINT "Ticket_eventId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ticket" DROP CONSTRAINT "Ticket_invitationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ticket" DROP CONSTRAINT "Ticket_seatId_fkey";

-- DropTable
DROP TABLE "public"."Event";

-- DropTable
DROP TABLE "public"."GuestProfile";

-- DropTable
DROP TABLE "public"."Invitation";

-- DropTable
DROP TABLE "public"."ScanLog";

-- DropTable
DROP TABLE "public"."Seat";

-- DropTable
DROP TABLE "public"."ShareGuard";

-- DropTable
DROP TABLE "public"."User";

-- DropEnum
DROP TYPE "public"."InvitationStatus";

-- DropEnum
DROP TYPE "public"."RsvpChoice";
