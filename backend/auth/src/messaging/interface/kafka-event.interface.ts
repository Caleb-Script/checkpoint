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
