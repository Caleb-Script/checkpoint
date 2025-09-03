/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// kafka-bootstrap.provider.ts

import { kafkaProducer, kafka } from '../config/kafka.config.js';
import { Provider } from '@nestjs/common';

export const KAFKA_INSTANCE = 'KAFKA_INSTANCE';
export const KAFKA_PRODUCER = 'KAFKA_PRODUCER';

export const kafkaInstanceProvider: Provider = {
  provide: KAFKA_INSTANCE,
  useValue: kafka,
};

export const kafkaProducerProvider: Provider = {
  provide: KAFKA_PRODUCER,
  useFactory: async () => {
    await kafkaProducer.connect();
    return kafkaProducer;
  },
};

export const kafkaBootstrapProvider: Provider[] = [
  kafkaInstanceProvider,
  kafkaProducerProvider,
];
