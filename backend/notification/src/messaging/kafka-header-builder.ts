import { TraceContext } from '../trace/trace-context.util.js';

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
