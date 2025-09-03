// src/messaging/kafka-event-dispatcher.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';

import {
  KAFKA_EVENT_METADATA,
  KAFKA_HANDLER,
} from './decorators/kafka-event.decorator.js';
import type { KafkaEventHandler } from './interface/kafka-event.interface.js';

@Injectable()
export class KafkaEventDispatcherService implements OnModuleInit {
  private readonly logger = new Logger(KafkaEventDispatcherService.name);
  private readonly topicToHandler = new Map<
    string,
    {
      handler: KafkaEventHandler;
      methodName: string;
    }
  >();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit(): void {
    const providers = this.discoveryService.getProviders();

    for (const wrapper of providers) {
      const { instance } = wrapper;

      if (!instance) continue;

      const handlerName = this.reflector.get<string>(
        KAFKA_HANDLER,
        instance.constructor,
      );
      if (!handlerName) continue;

      this.logger.debug(
        `📦 KafkaHandler erkannt: ${instance.constructor.name}`,
      );

      const prototype = Object.getPrototypeOf(instance);
      const methodNames = this.metadataScanner.getAllMethodNames(prototype);

      for (const methodName of methodNames) {
        const methodRef = prototype[methodName];
        const metadata = this.reflector.get(KAFKA_EVENT_METADATA, methodRef);

        if (!metadata) continue;

        const { topics } = metadata;

        for (const topic of topics) {
          this.logger.debug(
            `📩 Registriere Topic "${topic}" für ${instance.constructor.name}.${methodName}()`,
          );
          this.topicToHandler.set(topic, { handler: instance, methodName });
        }
      }
    }

    this.logger.debug(
      `✅ Kafka Topics registriert: ${Array.from(this.topicToHandler.keys()).join(', ')}`,
    );
  }

  async dispatch(topic: string, payload: any, context: any): Promise<void> {
    const match = this.topicToHandler.get(topic);

    if (!match) {
      this.logger.warn(`⚠ Kein Kafka-Handler für Topic "${topic}" gefunden.`);
      return;
    }

    const { handler, methodName } = match;

    try {
      await handler[methodName](topic, payload, context);
    } catch (err) {
      this.logger.error(`❌ Fehler bei der Verarbeitung von Topic "${topic}"`);
      this.logger.error(err);
    }
  }
}
