-- DropForeignKey
ALTER TABLE "public"."Invitation" DROP CONSTRAINT "Invitation_invitedByInvitationId_fkey";

-- AlterTable
ALTER TABLE "public"."Invitation" ADD COLUMN     "invitedByUser" TEXT,
ADD COLUMN     "plusOnes" TEXT[];
