// /backend/auth/src/messaging/kafka-event-dispatcher.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, ModuleRef, Reflector } from '@nestjs/core';
import { getLogger } from '../logger/logger.js';
import { KAFKA_EVENT_TOPICS } from './decorators/kafka-event.decorator.js';
import { KafkaEventContext } from './interface/kafka-event.interface.js';
import { TraceContextProvider } from '../trace/trace-context.provider.js';
import { TraceContextUtil } from '../trace/trace-context.util.js';

/**
 * Sammelt alle mit @KafkaEvent dekorierten Methoden per DiscoveryService
 * und dispatcht eingehende Messages an die registrierten Handler.
 *
 * - Getter/Setter werden NICHT ausgeführt (Descriptor-Check).
 * - Unterstützt 1:n (mehrere Handler pro Topic).
 * - Lazy resolve der Handler via ModuleRef.
 */
@Injectable()
export class KafkaEventDispatcherService implements OnModuleInit {
  private readonly logger = getLogger(KafkaEventDispatcherService.name);

  /**
   * topic -> Liste registrierter Handler (lazy)
   */
  private readonly registry = new Map<
    string,
    Array<{ token: unknown; methodName: string }>
  >();

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
    private readonly traceContextProvider: TraceContextProvider,
  ) {}

  onModuleInit(): void {
    const providers = this.discovery.getProviders();

    for (const wrapper of providers) {
      const instance: object | undefined = wrapper.instance as
        | object
        | undefined;
      let proto: object | null | undefined =
        instance != null
          ? Object.getPrototypeOf(instance)
          : wrapper.metatype?.prototype;

      while (proto && proto !== Object.prototype) {
        const names = Object.getOwnPropertyNames(proto);
        for (const name of names) {
          if (name === 'constructor') continue;

          const desc = Object.getOwnPropertyDescriptor(proto, name);
          // Nur echte Methoden (kein Getter/Setter), damit keine Side-Effects passieren
          if (!desc || typeof desc.value !== 'function') continue;

          const methodFn = desc.value as Function;
          const topics: string[] =
            this.reflector.get(KAFKA_EVENT_TOPICS, methodFn) ?? [];
          if (topics.length === 0) continue;

          for (const topic of topics) {
            this.logger.debug(
              '📩 Registriere Topic "%s" für %s.%s()',
              topic,
              wrapper.metatype?.name ??
                instance?.constructor?.name ??
                '<unknown>',
              name,
            );

            const entry = { token: wrapper.token, methodName: name };
            const list = this.registry.get(topic);
            if (list) list.push(entry);
            else this.registry.set(topic, [entry]);
          }
        }

        proto = Object.getPrototypeOf(proto);
      }
    }

    if (this.registry.size === 0) {
      this.logger.warn('Keine Kafka-Handler registriert (Registry ist leer)');
    }
  }

  /** Liefert alle Topics, für die tatsächlich Handler registriert sind. */
  getRegisteredTopics(): readonly string[] {
    return Array.from(this.registry.keys());
  }

  async dispatch(
    topic: string,
    payload: unknown,
    context: KafkaEventContext,
  ): Promise<void> {
    this.logger.debug(
      'dispatch: topic=%s, payload=%o, context=%o',
      topic,
      payload ?? '',
      context,
    );

    const handlers = this.registry.get(topic);
    if (!handlers || handlers.length === 0) {
      this.logger.warn('Kein Handler für Topic "%s" registriert', topic);
      return;
    }

    // TraceContext aus Kafka-Headern extrahieren und setzen
    const traceContext = TraceContextUtil.fromHeaders(context.headers);
    this.traceContextProvider.setContext(traceContext);

    // Seriell aufrufen (deterministische Reihenfolge)
    for (const { token, methodName } of handlers) {
      try {
        const instance: unknown = this.moduleRef.get(token as any, {
          strict: false,
        });
        const maybeFn = (instance as Record<string, unknown> | undefined)?.[
          methodName
        ];

        if (typeof maybeFn !== 'function') {
          this.logger.error(
            'Handler-Instanz für %s.%s ist nicht aufrufbar',
            (instance as any)?.constructor?.name ?? '<unknown>',
            methodName,
          );
          continue;
        }

        const fn = maybeFn as (
          t: string,
          d: unknown,
          c: KafkaEventContext,
        ) => Promise<void>;
        await fn.call(instance, topic, payload, context);
      } catch (err) {
        this.logger.error(
          'Fehler beim Verarbeiten von Topic "%s" in %s.%s(): %s',
          topic,
          (this as any)?.constructor?.name ?? '<Dispatcher>',
          methodName,
          (err as Error).message,
        );
      }
    }
  }
}
