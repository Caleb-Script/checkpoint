// messaging/kafka-bootstrap.provider.ts
import { KafkaConsumerService } from './kafka-consumer.service';
import { getKafkaTopicsBy } from './kafka-topic.properties';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class KafkaBootstrap implements OnModuleInit {
  constructor(private readonly consumer: KafkaConsumerService) {}

  async onModuleInit(): Promise<void> {
    await this.consumer.consume({ topics: getKafkaTopicsBy(['user']) });
  }
}
