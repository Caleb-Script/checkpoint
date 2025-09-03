// kafka-consumer.service.ts
// ✅ Kafka Consumer Service mit Lifecycle-Management und Dispatcher-Aufruf

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { KafkaEventDispatcherService } from "./kafka-event-dispatcher.service";
import { createKafkaConsumer } from "../config/kafka.config";

/**
 * KafkaConsumerService
 * Verwaltet das Abonnieren und Verarbeiten von Kafka-Nachrichten
 */
@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private readonly consumer = createKafkaConsumer("checkpoint-invitation");

  constructor(private readonly dispatcher: KafkaEventDispatcherService) {}

  /**
   * Startet den Kafka-Consumer bei Anwendungsstart.
   */
  async onModuleInit(): Promise<void> {
    await this.consumer.connect();

    await this.consumer.subscribe({
      topic: "invitation.add.user",
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const rawValue = message.value?.toString();
          if (!rawValue) return;

          const payload = JSON.parse(rawValue);

          this.logger.log(`📩 Event erfolgreich empfangen: ${topic}`);

          await this.dispatcher.dispatch(topic, payload, {
            topic,
            partition,
            offset: message.offset,
            headers: message.headers,
            timestamp: message.timestamp,
          });
        } catch (err) {
          this.logger.error("Fehler beim Verarbeiten der Kafka-Nachricht", err);
        }
      },
    });
  }

  /**
   * Trenne Verbindung beim Shutdown
   */
  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
  }
}
