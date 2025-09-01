import { forwardRef, Module } from "@nestjs/common";
import { InvitationReadService } from "./service/invitation-read.service.js";
import { InvitationQueryResolver } from "./resolver/invitation-query.resolver.js";
import { InvitationMutationResolver } from "./resolver/invitation-mutation.resolver.js";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { join } from "path";
import { InvitationWriteService } from "./service/invitation-write.service.js";
import { KafkaModule } from "../messaging/kafka.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { PUB_SUB, PubSubProvider } from "./utils/pubsub.provider.js";
import { InvitationSubscriptionResolver } from "./resolver/Invitation-subscription.resolver.js";

@Module({
  imports: [KafkaModule, PrismaModule],
  providers: [
    InvitationReadService,
    InvitationWriteService,
    InvitationQueryResolver,
    InvitationMutationResolver,
    InvitationSubscriptionResolver,
    PubSubProvider,
  ],
  exports: [InvitationReadService, InvitationWriteService, PUB_SUB],
})
export class InvitationModule {}
