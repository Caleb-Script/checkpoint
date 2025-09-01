// messaging/kafka-bootstrap.provider.ts

import { KafkaConsumerService } from './kafka-consumer.service.js';
import { getKafkaTopicsBy } from './kafka-topic.properties.js';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class KafkaBootstrap implements OnModuleInit {
  readonly #consumer: KafkaConsumerService;

  constructor(consumer: KafkaConsumerService) {
    this.#consumer = consumer;
  }

  async onModuleInit(): Promise<void> {
    await this.#consumer.consume({ topics: getKafkaTopicsBy(['auth']) });
  }
}
