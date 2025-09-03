// kafka.ts (früher kafka.config.ts)
// ✅ Zentrale Kafka-Instanz mit korrektem Partitioner und Timeouts

import { Kafka, Partitioners, logLevel } from 'kafkajs';

/**
 * Kafka-Konfiguration für den Microservice.
 * Diese Instanz wird als Singleton verwendet.
 */
export const kafka = new Kafka({
  clientId: 'checkpoint-ticket',
  brokers: ['localhost:9092'],
  logLevel: logLevel.INFO,
  connectionTimeout: 10000,
  requestTimeout: 30000,
});

/**
 * KafkaJS Producer mit Legacy Partitioner (wichtig für stabile Verteilung)
 */
export const kafkaProducer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});

/**
 * KafkaJS Consumer Factory
 * @param groupId - ConsumerGroup-ID
 */
export const createKafkaConsumer = (groupId: string) =>
  kafka.consumer({
    groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
  });
