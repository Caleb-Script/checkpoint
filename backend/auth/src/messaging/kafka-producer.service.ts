// kafka-producer.service.ts
// ✅ Verwaltet den Kafka Producer als langlebige Instanz

import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Producer } from 'kafkajs';
import { TraceContext } from '../trace/trace-context.util.js';
import { KafkaTopics } from './kafka-topic.properties.js';
import { KafkaEnvelope } from './decorators/kafka-envelope.type.js';

/**
 * KafkaProducerService
 * Bietet eine einfache API zum Versenden von Nachrichten an Kafka.
 */
@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject('KAFKA_PRODUCER')
    private readonly producer: Producer,
  ) {}

  /**
   * Initialisiert die Verbindung zum Kafka-Cluster beim Start.
   */
  async onModuleInit(): Promise<void> {
    if (!this.producer) return;
    await this.producer.connect();
  }

  /**
   * Sendet eine Nachricht an das angegebene Topic.
   * @param topic - Kafka Topic
   * @param message - Datenobjekt
   */
  async send<T>(topic: string, message: KafkaEnvelope<T>) {
    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  }

  /**
   * Convenience-Methode für Einladungsgenehmigung: sendet an auth.create
   * @param payload - Nutzdaten des Benutzers
   * @param service - Ursprungs-Service
   * @param trace - Optionaler Tracing-Kontext
   */
  async addUser(
    payload: { userId: string; invitationId: string },
    service: string,
    trace?: TraceContext,
  ): Promise<void> {
    const topic = KafkaTopics.invitation.addUser;
    const message = {
      event: 'addUserId',
      service,
      version: 'v1',
      trace,
      payload,
    };
    await this.send(topic, message);
  }

  async sendUserCredentials(
    payload: {
      userId: string;
      firstName: string;
      username: string;
      password: string;
      phoneNumber?: string;
    },
    service: string,
    trace?: TraceContext,
  ) {
    const topic = KafkaTopics.notification.sendCredentials;
    const message = {
      event: 'sendCredentials',
      service,
      version: 'v1',
      trace,
      payload,
    };
    await this.send(topic, message);
  }

  /**
   * Trennt die Verbindung zum Kafka-Cluster beim Shutdown.
   */
  async onModuleDestroy(): Promise<void> {
    if (!this.producer) return;
    await this.producer.disconnect();
  }
}
