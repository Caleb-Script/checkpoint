// kafka-bootstrap.provider.ts

import { Provider } from "@nestjs/common";
import { kafkaProducer, kafka } from "../config/kafka.config.js";

export const KAFKA_INSTANCE = "KAFKA_INSTANCE";
export const KAFKA_PRODUCER = "KAFKA_PRODUCER";

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
