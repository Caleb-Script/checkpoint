// src/kafka/kafka-event-dispatcher.service.ts
import { Injectable, OnModuleInit } from "@nestjs/common";
import { DiscoveryService, Reflector } from "@nestjs/core";
import { KafkaEventContext } from "../messaging/interface/kafka-event.interface.js";
import { getLogger } from "../logger/logger.js";
import { TraceContextUtil } from "../trace/trace-context.util.js";
import { TraceContextProvider } from "../trace/trace-context.provider.js";
import { KAFKA_EVENT_TOPICS } from "../messaging/decorators/kafka-event.decorator.js";

@Injectable()
export class KafkaEventDispatcherService implements OnModuleInit {
  readonly #logger = getLogger(KafkaEventDispatcherService.name);
  readonly #handlerMap: Map<
    string,
    (topic: string, data: unknown, context: KafkaEventContext) => Promise<void>
  > = new Map();
  readonly #discoveryService: DiscoveryService;
  readonly #reflector: Reflector;
  readonly #traceContextProvider: TraceContextProvider;

  constructor(
    discoveryService: DiscoveryService,
    reflector: Reflector,
    traceContextProvider: TraceContextProvider,
  ) {
    this.#discoveryService = discoveryService;
    this.#reflector = reflector;
    this.#traceContextProvider = traceContextProvider;
  }

  onModuleInit(): void {
    const providers = this.#discoveryService.getProviders();

    for (const wrapper of providers) {
      const { instance } = wrapper;
      if (!instance || typeof instance !== "object") continue;
      const prototype = Object.getPrototypeOf(instance);
      if (!prototype || prototype === null) continue;

      const methodNames = Object.getOwnPropertyNames(prototype).filter((m) => {
        try {
          const value = prototype[m];
          return typeof value === "function" && m !== "constructor";
        } catch {
          // Getter wirft Fehler → ignorieren
          return false;
        }
      });

      for (const methodName of methodNames) {
        const method = prototype[methodName];
        const topics: string[] =
          this.#reflector.get(KAFKA_EVENT_TOPICS, method) ?? [];

        for (const topic of topics) {
          this.#logger.debug(
            `📩 Registriere Topic "${topic}" für ${instance.constructor.name}.${methodName}()`,
          );

          this.#handlerMap.set(topic, async (t, d, c) => {
            try {
              await method.call(instance, t, d, c);
            } catch (err) {
              this.#logger.error(
                `Fehler beim Aufruf von ${instance.constructor.name}.${methodName}:`,
                err,
              );
            }
          });
        }
      }
    }
  }

  async dispatch(
    topic: string,
    payload: any,
    context: KafkaEventContext,
  ): Promise<void> {
    this.#logger.debug(
      "dispatch: topic=%s, payload=%o, context=%o",
      topic,
      payload,
      context,
    );

    const handler = this.#handlerMap.get(topic);
    if (!handler) {
      this.#logger.warn(`Kein Handler für Topic "${topic}" registriert`);
      return;
    }

    const traceContext = TraceContextUtil.fromHeaders(context.headers);
    this.#traceContextProvider.setContext(traceContext);

    try {
      await handler(topic, payload, context);
    } catch (error) {
      this.#logger.error(
        `Fehler beim Verarbeiten von Topic "${topic}":`,
        error,
      );
    }
  }
}
