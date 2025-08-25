import { forwardRef, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { KafkaConsumerService } from './kafka-consumer.service.js';
import { KafkaEventDispatcherService } from './kafka-event-dispatcher.service.js';
import { KafkaProducerService } from './kafka-producer.service.js';
import { KafkaHeaderBuilder } from './kafka-header-builder.js';
import { TraceModule } from '../trace/trace.module.js';
import { UserHandler } from './handlers/user.handler.js';
import { KeycloakModule } from '../security/keycloak/keycloak.module.js';

@Module({
  imports: [
    DiscoveryModule,
    forwardRef(() => TraceModule),
    forwardRef(() => KeycloakModule),
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
