// kafka-envelope.type.ts
// ✅ Typisierte Event-Hülle für Kafka-Nachrichten zur Standardisierung von Payloads

/**
 * KafkaEnvelope
 * Einheitliches Nachrichtenformat für Kafka-Nachrichten in allen Services.
 *
 * @template T - Nutzdatenstruktur (Payload)
 */
export interface KafkaEnvelope<T = unknown> {
  /**
   * Event-Name (z. B. "acceptRsvp", "deleteUser")
   */
  event: string;

  /**
   * Ursprungs-Service (z. B. "invitation-service")
   */
  service: string;

  /**
   * Versionskennung (z. B. "v1")
   */
  version: string;

  /**
   * Tracing-/Correlation-Kontext
   */
  trace?: Record<string, any>;

  /**
   * Nutzdaten (z. B. Benutzer, Einladung, etc.)
   */
  payload: T;
}
