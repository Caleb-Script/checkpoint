// src/messaging/interface/kafka-event.interface.ts
export interface KafkaEventContext {
  topic: string;
  partition: number;
  offset: string;
  headers: Record<string, string | undefined>;
  timestamp: string;
}

export interface KafkaEventHandler {
  handle(
    topic: string,
    data: unknown,
    context: KafkaEventContext,
  ): Promise<void>;
}

function readHeader(ctx: KafkaEventContext, key: string): string | null {
  const v = ctx.headers?.[key];
  if (!v) return null;
  return String(v).trim() || null;
}

/** Ermittelt den Mandanten aus Kafka-Headern (oder null) */
export function tenantFromKafka(ctx: KafkaEventContext): string | null {
  // bevorzugte Header-Namen – passe nach deinem Producer an
  return (
    readHeader(ctx, 'x-tenant-id') ??
    readHeader(ctx, 'x-org-id') ??
    readHeader(ctx, 'x-event-id') ??
    readHeader(ctx, 'tenant') ??
    null
  );
}
