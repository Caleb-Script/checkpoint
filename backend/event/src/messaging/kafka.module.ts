/**
 * @file kafka.module.ts
 * Vollständiges Kafka-Nest-Modul inkl. Discovery für Handler-Autoregistrierung.
 */

import { Module } from '@nestjs/common';
import { DiscoveryModule, Reflector } from '@nestjs/core';

import { kafkaBootstrapProvider } from './kafka-bootstrap.provider.js';
import { KafkaConsumerService } from './kafka-consumer.service.js';
import { KafkaEventDispatcherService } from './kafka-event-dispatcher.service.js';
import { KafkaHeaderBuilder } from './kafka-header-builder.js';
import { KafkaProducerService } from './kafka-producer.service.js';

@Module({
  imports: [DiscoveryModule],
  providers: [
    KafkaProducerService,
    KafkaConsumerService,
    KafkaEventDispatcherService,
    KafkaHeaderBuilder,
    Reflector,
    ...kafkaBootstrapProvider,
  ],
  exports: [
    KafkaProducerService,
    KafkaConsumerService,
    'KAFKA_PRODUCER', // ✅ das ist wichtig!
    'KAFKA_INSTANCE', // optional, falls du kafka auch injizierst
  ],
})
export class KafkaModule {}
