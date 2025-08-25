import { forwardRef, Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { KafkaConsumerService } from "./kafka-consumer.service.js";
import { KafkaEventDispatcherService } from "./kafka-event-dispatcher.service.js";
import { KafkaProducerService } from "./kafka-producer.service.js";
import { KafkaHeaderBuilder } from "./kafka-header-builder.js";
import { TraceModule } from "../trace/trace.module.js";
import { InvitationModule } from "../invitation/invitation.module.js";
import { UserHandler } from "./handlers/user.handler.js";

@Module({
  imports: [
    DiscoveryModule,
    forwardRef(() => InvitationModule),
    forwardRef(() => TraceModule),
  ],
  providers: [
    KafkaProducerService,
    KafkaConsumerService,
    KafkaEventDispatcherService,
    UserHandler,
    KafkaHeaderBuilder,
  ],
  exports: [KafkaProducerService, KafkaConsumerService],
})
export class KafkaModule {}
