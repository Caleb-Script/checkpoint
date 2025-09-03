import { TraceContext } from '../trace/trace-context.util.js';

// kafka-header-builder.ts
// ✅ Utility zur Erstellung standardisierter Kafka-Header (z. B. für Traceability, Correlation ID)

/**
 * Erstellt Kafka-kompatible Header mit standardisierten Feldern.
 * @param headers - Zusätzliche Header-Felder, die hinzugefügt werden sollen
 * @returns Kafka-kompatibles Header-Objekt (Record<string, Buffer>)
 */
export function buildKafkaHeaders(
  headers: Record<string, string> = {},
): Record<string, Buffer> {
  return Object.entries({
    'x-trace-id': generateUUID(),
    ...headers,
  }).reduce(
    (acc, [key, value]) => {
      acc[key] = Buffer.from(value);
      return acc;
    },
    {} as Record<string, Buffer>,
  );
}

/**
 * Erzeugt eine einfache UUID (nicht RFC-konform, aber eindeutig genug für Tracing-Zwecke).
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Erzeugt standardisierte Kafka-Header für Event-Messages.
 */
export class KafkaHeaderBuilder {
  /**
   * Standardheader für ein Kafka-Event.
   *
   * @param topic     Name des Kafka-Themas (z. B. `log-topic`)
   * @param operation Art des Events (z. B. `log`, `create`)
   * @param trace     TraceContext mit Trace-ID und Sampling-Info
   * @param version   Version des Event-Schemas
   * @param service   Ursprung des Events
   */
  static buildStandardHeaders(
    topic: string,
    operation: string,
    trace?: TraceContext,
    version = 'v1',
    service = 'unknown-service',
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'x-event-name': topic,
      'x-event-type': operation,
      'x-event-version': version,
      'x-service': service,
    };

    if (trace?.traceId) {
      headers['x-trace-id'] = trace.traceId;
      headers['x-b3-traceid'] = trace.traceId;
    }

    if (trace?.sampled !== undefined) {
      headers['x-b3-sampled'] = trace.sampled ? '1' : '0';
    }

    return headers;
  }
}
