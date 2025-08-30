/* eslint-disable no-unused-private-class-members */
import { KafkaProducerService } from '../messaging/kafka-producer.service.js';
import { KafkaTopics } from '../messaging/kafka-topic.properties.js';
import { TraceContext } from '../trace/trace-context.util.js';
import { getLogger } from './logger.js';
import {
  trace,
  context,
  SpanKind,
  SpanStatusCode,
  SpanContext,
  Tracer,
} from '@opentelemetry/api';
import { format } from 'util';

const LogLevel = {
  TRACE: 'TRACE',
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export interface LogEventDTO {
  level: LogLevel;
  message: string;
  service: string;
  context: string;
  traceContext?: TraceContext;
  timestamp: string;
}

export class LoggerPlus {
  private traceContext?: TraceContext;
  readonly #context: string;
  readonly #kafka: KafkaProducerService;
  readonly #serviceName: string;
  readonly #tracer: Tracer;

  constructor(
    context: string,
    kafka: KafkaProducerService,
    serviceName: string = 'shopping-cart-service',
  ) {
    this.#context = context;
    this.#kafka = kafka;
    this.#serviceName = serviceName;
    this.logger = getLogger(this.#context);
    this.#tracer = trace.getTracer('logger-plus');
  }

  private readonly logger;

  public withContext(traceContext?: TraceContext): LoggerPlus {
    this.traceContext = traceContext;
    return this;
  }

  private getCaller(): string {
    const err = new Error();
    const stack = err.stack?.split('\n') ?? [];

    for (const line of stack) {
      if (
        line.includes('LoggerPlus.') === false && // rausfiltern
        line.includes('at ') &&
        !line.includes('node:') // optional: interne Node-Calls ausschließen
      ) {
        const match = line.match(/at\s+([^\s]+)\s/);
        if (match) {
          const fullMethod = match[1]; // z.B. InvitationWriteService.create
          const methodName = fullMethod.split('.').pop() ?? 'unknown';
          return `${this.#context}#${methodName}`;
        }
      }
    }

    return `${this.#context}#unknown`;
  }

  private async sendLog(level: LogLevel, message: string) {
    // Entscheide, ob ein manueller TraceContext gesetzt wurde
    const isExternalTraceContext = !!this.traceContext;

    let traceContext = this.traceContext;
    if (!traceContext) {
      const activeSpan = trace.getSpan(context.active());
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        traceContext = {
          traceId: spanContext.traceId,
          spanId: spanContext.spanId,
          sampled: spanContext.traceFlags === 1,
        };
      }
    }

    // Optionale Span-Verlinkung bei manuellem TraceContext
    const links: { context: SpanContext }[] = [];

    if (
      isExternalTraceContext &&
      traceContext?.traceId &&
      traceContext?.spanId
    ) {
      links.push({
        context: {
          traceId: traceContext.traceId,
          spanId: traceContext.spanId,
          traceFlags: traceContext.sampled ? 1 : 0,
          // 👇 isRemote ist optional, wird aber vom SDK verstanden
          isRemote: true,
        },
      });
    }

    await this.#tracer.startActiveSpan(
      `logger.${level.toLowerCase()}`,
      {
        kind: SpanKind.INTERNAL,
        links,
      },
      async (span) => {
        try {
          const logPayload: LogEventDTO = {
            level,
            message,
            service: this.#serviceName,
            context: this.getCaller(),
            traceContext,
            timestamp: new Date().toISOString(),
          };

          // await this.#kafka.sendEvent(
          //     KafkaTopics.logstream.log,
          //     'log',
          //     logPayload,
          //     this.#serviceName,
          //     'v1',
          //     traceContext,
          // );

          span.setStatus({ code: SpanStatusCode.OK });
        } catch (err) {
          span.recordException(err as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (err as Error).message,
          });
        } finally {
          span.end();
        }
      },
    );
  }

  async debug(message: string, ...args: unknown[]) {
    const msg = format(message, ...args);
    this.logger.debug(msg);
    // await this.sendLog(LogLevel.DEBUG, msg);
  }

  async info(message: string, ...args: unknown[]) {
    const msg = format(message, ...args);
    this.logger.info(msg);
    await this.sendLog(LogLevel.INFO, msg);
  }

  async warn(message: string, ...args: unknown[]) {
    const msg = format(message, ...args);
    this.logger.warn(msg);
    await this.sendLog(LogLevel.WARN, msg);
  }

  async error(message: string, ...args: unknown[]) {
    const msg = format(message, ...args);
    this.logger.error(msg);
    await this.sendLog(LogLevel.ERROR, msg);
  }

  async trace(message: string, ...args: unknown[]) {
    const msg = format(message, ...args);
    this.logger.trace?.(msg); // trace ist in Pino optional
    // await this.sendLog(LogLevel.TRACE, msg);
  }
}

// Verwendung:
// const logger = loggerService.getLogger(MyService.name).withContext(traceContext);
// await logger.info('myMethod', 'Meine Nachricht');
