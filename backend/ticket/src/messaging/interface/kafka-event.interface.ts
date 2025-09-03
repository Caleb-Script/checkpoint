// kafka-event.interface.ts
// ✅ Schnittstelle für alle Kafka-Event-Handler-Klassen

/**
 * KafkaEventHandler
 * Muss von allen Klassen implementiert werden, die @KafkaEvent nutzen.
 */
export interface KafkaEventHandler {
  /**
   * Handle-Funktion, die beim Empfang eines Events aufgerufen wird.
   * @param topic - Kafka Topic, von dem die Nachricht stammt
   * @param data - Deserialisierte Nachricht
   * @param context - Kafka-Metadaten (z.B. Header, Partition)
   */
  handle(
    topic: string,
    data: any,
    context?: Record<string, any>,
  ): Promise<void>;
}

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
