import { forwardRef, Module } from "@nestjs/common";
import { InvitationReadService } from "./service/invitation-read.service.js";
import { InvitationQueryResolver } from "./resolver/invitation-query.resolver.js";
import { InvitationMutationResolver } from "./resolver/invitation-mutation.resolver.js";
import { PrismaService } from "./service/prisma.service.js";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { join } from "path";
import { InvitationWriteService } from "./service/invitation-write.service.js";
import { KafkaModule } from "../messaging/kafka.module.js";

@Module({
  imports: [forwardRef(() => KafkaModule)],
  providers: [
    InvitationReadService,
    InvitationWriteService,
    InvitationQueryResolver,
    InvitationMutationResolver,
    PrismaService,
  ],
  exports: [InvitationReadService, InvitationWriteService],
})
export class InvitationModule {}
