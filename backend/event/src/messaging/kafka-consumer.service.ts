import { groupId, kafkaBroker } from '../config/kafka.js';
import { LoggerPlus } from '../logger/logger-plus.js';
import { LoggerService } from '../logger/logger.service.js';
import { TraceContextUtil } from '../trace/trace-context.util.js';
import type { KafkaEventContext } from './interface/kafka-event.interface.js';
import { KafkaEventDispatcherService } from './kafka-event-dispatcher.service.js';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import {
  context as otelContext,
  SpanContext,
  SpanKind,
  SpanStatusCode,
  trace,
  Tracer,
} from '@opentelemetry/api';
import { Kafka, Consumer, ConsumerSubscribeTopics } from 'kafkajs';

/**
 * Kafka Consumer zur Registrierung von Topic-Handlern.
 */
@Injectable()
export class KafkaConsumerService implements OnApplicationShutdown {
  private readonly kafka = new Kafka({ brokers: [kafkaBroker] });
  private readonly consumers: Consumer[] = [];
  private readonly tracer: Tracer = trace.getTracer('kafka-consumer');

  readonly #dispatcher: KafkaEventDispatcherService;
  readonly #loggerService: LoggerService;

  constructor(
    dispatcher: KafkaEventDispatcherService,
    loggerService: LoggerService,
  ) {
    this.#dispatcher = dispatcher;
    this.#loggerService = loggerService;
  }

  async consume(topics: ConsumerSubscribeTopics): Promise<void> {
    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe(topics);

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const headers = Object.fromEntries(
          Object.entries(message.headers ?? {}).map(([key, val]) => [
            key,
            val?.toString(),
          ]),
        );

        // ⬅️ 1. TraceContext aus Kafka-Headers extrahieren (W3C oder B3)
        const traceContext = TraceContextUtil.fromHeaders(headers);

        // ⬅️ 2. OpenTelemetry-Kontext aus propagierten Headern extrahieren
        // const parentContext = propagation.extract(otelContext.active(), headers);

        // ⬅️ 3. Optional: SpanLink setzen, um Producer-Trace zu verlinken
        const links: { context: SpanContext }[] = [];
        if (traceContext.traceId && traceContext.spanId) {
          links.push({
            context: {
              traceId: traceContext.traceId,
              spanId: traceContext.spanId,
              traceFlags: traceContext.sampled ? 1 : 0,
              isRemote: true,
            },
          });
        }

        // ⬅️ 4. Kafka-Consumer-Span starten
        const span = this.tracer.startSpan(`kafka.receive.${topic}`, {
          kind: SpanKind.CONSUMER,
          attributes: {
            'messaging.system': 'kafka',
            'messaging.destination': topic,
            'messaging.destination_kind': 'topic',
            'messaging.operation': 'consume',
          },
          links,
        });

        const spanCtx = trace.setSpan(otelContext.active(), span);

        await otelContext.with(spanCtx, async () => {
          try {
            const valueBuffer = message.value;
            const value = valueBuffer
              ? Buffer.from(valueBuffer).toString()
              : '{}';
            const payload = JSON.parse(value);

            const eventName = headers['x-event-name'] ?? topic;
            const kafkaContext: KafkaEventContext = {
              topic,
              partition,
              offset: message.offset,
              headers,
              timestamp: message.timestamp,
            };

            span.setAttributes({
              'kafka.topic': topic,
              'kafka.partition': partition,
              'kafka.offset': message.offset,
              'kafka.event.name': eventName,
            });

            // ⬅️ 5. Logger mit TraceContext verlinken (für Kafka-Logevent)
            const logger: LoggerPlus = this.#loggerService
              .getLogger(KafkaConsumerService.name)
              .withContext(traceContext);

            await logger.info(`Event erfolgreich empfangen: ${eventName}`);

            // ⬅️ 6. Event an passenden Handler weiterreichen
            await this.#dispatcher.dispatch(eventName, payload, kafkaContext);

            span.setStatus({ code: SpanStatusCode.OK });
          } catch (err) {
            span.recordException(err as Error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: (err as Error).message,
            });

            const fallbackLogger = this.#loggerService.getLogger(
              KafkaConsumerService.name,
            );
            fallbackLogger.error('Kafka-Consumer-Fehler: %o', err);

            throw err;
          } finally {
            span.end();
          }
        });
      },
    });

    this.consumers.push(consumer);
  }

  async onApplicationShutdown(): Promise<void> {
    for (const consumer of this.consumers) {
      await consumer.disconnect();
    }
  }
}
