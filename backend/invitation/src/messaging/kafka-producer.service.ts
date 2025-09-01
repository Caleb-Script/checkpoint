// src/kafka/kafka-producer.service.ts
import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from "@nestjs/common";
import { context, SpanStatusCode, trace, Tracer } from "@opentelemetry/api";
import { Kafka, Message, Producer, ProducerRecord } from "kafkajs";
import { kafkaBroker } from "../config/kafka.js";
import { CreateUserDTO } from "../invitation/models/dto/create-user.dto.js";
import { TraceContext } from "../trace/trace-context.util.js";
import { KafkaHeaderBuilder } from "./kafka-header-builder.js";
import { KafkaTopics } from "./kafka-topic.properties.js";

/**
 * Kafka Producer zum Senden von Nachrichten.
 */
@Injectable()
export class KafkaProducerService
  implements OnModuleInit, OnApplicationShutdown {
  private readonly kafka = new Kafka({ brokers: [kafkaBroker] });
  private readonly producer: Producer = this.kafka.producer();
  private readonly tracer: Tracer = trace.getTracer("kafka-producer");

  async onModuleInit(): Promise<void> {
    await this.producer.connect();
  }

  /**
   * Sende ein vollständiges ProducerRecord.
   */
  async produce(record: ProducerRecord): Promise<void> {
    await this.tracer.startActiveSpan("kafka.producer.send", async (span) => {
      try {
        span.setAttribute("kafka.topic", record.topic);
        span.setAttribute("kafka.message.count", record.messages.length);

        await context.with(
          trace.setSpanContext(context.active(), span.spanContext()),
          async () => {
            await this.producer.send(record);
          },
        );
      } catch (err) {
        span.recordException(err as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: "Kafka Send Failed",
        });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Komfortable Methode zum Senden eines Events mit Standard-Headern.
   *
   * @param topic Kafka-Topic
   * @param eventName Event-Identifier
   * @param payload Inhalt der Nachricht
   * @param service Service-Name (z. B. 'shopping-cart')
   * @param version Event-Version (z. B. 'v1')
   * @param trace Optional: TraceContext
   */
  async sendEvent(
    topic: string,
    eventName: string,
    payload: unknown,
    service: string,
    version = "v1",
    traceContext?: TraceContext,
  ): Promise<void> {
    const span = this.tracer.startSpan(
      `kafka.producer.send.${topic}.${eventName}`,
      {
        attributes: {
          "messaging.system": "kafka",
          "messaging.destination": topic,
          "messaging.destination_kind": "topic",
          "messaging.operation": eventName,
          "messaging.kafka.message_type":
            payload?.constructor?.name || typeof payload,
        },
      },
    );

    try {
      const headers = KafkaHeaderBuilder.buildStandardHeaders(
        topic,
        eventName,
        traceContext,
        version,
        service,
      );

      const message: Message = {
        value: Buffer.from(JSON.stringify(payload)), // 👈 explizit JSON
        headers,
      };

      await context.with(
        trace.setSpanContext(context.active(), span.spanContext()),
        async () => {
          await this.producer.send({ topic, messages: [message] });
        },
      );
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (err as Error).message,
      });
      throw err;
    } finally {
      span.end();
    }
  }

  async approved(
    payload: CreateUserDTO,
    service: string,
    trace?: TraceContext,
  ): Promise<void> {
    const topic = KafkaTopics.auth.approve;
    await this.sendEvent(topic, "acceptRsvp", payload, service, "v1", trace);
  }

  // async releaseItem(
  //     payload: unknown,
  //     service: string,
  //     trace?: TraceContext,
  // ): Promise<void> {
  //     const topic = KafkaTopics.inventory.release;
  //     await this.sendEvent(
  //         topic,
  //         'releaseItem',
  //         payload,
  //         service,
  //         'v1',
  //         trace,
  //     );
  // }

  // /**
  //  * Spezifischer Shortcut zum Versenden von Mail-Nachrichten.
  //  */
  // async sendMailNotification(
  //     eventType: 'create' | 'delete',
  //     payload: unknown,
  //     service: string,
  //     trace?: TraceContext,
  // ): Promise<void> {
  //     const topic =
  //         eventType === 'create'
  //             ? KafkaTopics.notification.create
  //             : KafkaTopics.notification.delete;

  //     await this.sendEvent(
  //         topic,
  //         `sendMail.${eventType}`,
  //         payload,
  //         service,
  //         'v1',
  //         trace,
  //     );
  // }

  async onApplicationShutdown(): Promise<void> {
    await this.producer.disconnect();
  }
}
