import { Module } from "@nestjs/common";
import { UserHandler } from "./user.handler.js";
import { InvitationModule } from "../invitation/invitation.module.js";

@Module({
  imports: [InvitationModule],
  providers: [UserHandler],
  exports: [UserHandler],
})
export class HandlerModule {}
