import { Injectable } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import { HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class KafkaIndicator {
  async isHealthy(): Promise<HealthIndicatorResult> {
    const kafka = new Kafka({
      brokers: [process.env.KAFKA_BROKER!],
      clientId: 'health-check',
    });

    const admin = kafka.admin();

    try {
      await admin.connect();
      await admin.disconnect();

      return {
        kafka: {
          status: 'up',
        },
      };
    } catch (error) {
      return {
        kafka: {
          status: 'down',
          message: 'Kafka not reachable',
        },
      };
    }
  }
}
