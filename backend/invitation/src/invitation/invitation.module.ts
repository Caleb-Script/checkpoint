import { Module } from "@nestjs/common";
import { InvitationReadService } from "./service/invitation-read.service.js";
import { InvitationQueryResolver } from "./resolver/invitation-query.resolver.js";
import { InvitationMutationResolver } from "./resolver/invitation-mutation.resolver.js";
import { PrismaService } from "./service/prisma.service.js";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from "path";
import { InvitationWriteService } from "./service/invitation-write.service.js";

@Module({
  providers: [
    InvitationReadService,
    InvitationWriteService,
    InvitationQueryResolver,
    InvitationMutationResolver,
    PrismaService
  ],
})
export class InvitationModule {}
