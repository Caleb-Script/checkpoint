import { forwardRef, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { KafkaConsumerService } from './kafka-consumer.service.js';
import { KafkaEventDispatcherService } from './kafka-event-dispatcher.service.js';
import { KafkaProducerService } from './kafka-producer.service.js';
import { KafkaHeaderBuilder } from './kafka-header-builder.js';
import { TraceModule } from '../trace/trace.module.js';
import { TicketModule } from '../ticket/ticket.module.js';
import { EventHandler } from './handlers/event.handler.js';

@Module({
  imports: [
    DiscoveryModule,
    forwardRef(() => TicketModule),
    forwardRef(() => TraceModule),
  ],
  providers: [
    KafkaProducerService,
    KafkaConsumerService,
    KafkaEventDispatcherService,
    KafkaHeaderBuilder,
    EventHandler,
  ],
  exports: [KafkaProducerService, KafkaConsumerService],
})
export class KafkaModule {}
