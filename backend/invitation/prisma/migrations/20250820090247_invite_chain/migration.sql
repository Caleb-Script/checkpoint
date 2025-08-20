-- CreateIndex
CREATE INDEX "Invitation_invitedByInvitationId_idx" ON "public"."Invitation"("invitedByInvitationId");

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_invitedByInvitationId_fkey" FOREIGN KEY ("invitedByInvitationId") REFERENCES "public"."Invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
