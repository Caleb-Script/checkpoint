/**
 * Kontextinformationen für Tracing mit Zipkin / B3.
 */
export interface TraceContext {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  sampled?: boolean;
}

/**
 * Hilfsfunktionen zur Extraktion von Trace-Informationen aus Headern.
 */
export class TraceContextUtil {
  /**
   * Erzeugt einen TraceContext aus HTTP- oder Kafka-Headern.
   *
   * Unterstützt sowohl B3- als auch W3C Trace Context (z. B. traceparent).
   */
  static fromHeaders(
    headers: Record<string, unknown> | undefined,
  ): TraceContext {
    if (!headers) return {};

    const get = (key: string) =>
      (headers[key] ?? headers[key.toLowerCase()]) as string | undefined;

    // 🎯 W3C trace context parsing
    const traceparent = get('traceparent');

    if (traceparent) {
      // Format: version-traceid-spanid-flags (z. B. 00-<traceId>-<spanId>-01)
      const match = traceparent.match(/^(\w+)-(\w{32})-(\w{16})-(\w{2})$/);
      if (match) {
        const [, , traceId, spanId, flags] = match;
        return {
          traceId,
          spanId,
          sampled: flags === '01',
        };
      }
    }

    // 🧾 Fallback: B3/Zipkin Header parsing
    const traceId = get('x-b3-traceid') ?? get('x-trace-id');
    const spanId = get('x-b3-spanid');
    const parentSpanId = get('x-b3-parentspanid');
    const sampledRaw = get('x-b3-sampled');
    const sampled = sampledRaw === '1' || sampledRaw === 'true';

    return {
      traceId,
      spanId,
      parentSpanId,
      sampled: sampledRaw !== undefined ? sampled : undefined,
    };
  }
}
