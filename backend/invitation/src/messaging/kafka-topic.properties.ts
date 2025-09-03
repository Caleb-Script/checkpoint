// kafka-topic.properties.ts
// ✅ Einheitliche Definition der verwendeten Kafka-Topics

/**
 * Zentrale Konfiguration aller Kafka-Topics im System.
 * Dient der Typsicherheit, Übersichtlichkeit und Wiederverwendbarkeit in Publishern und Handlern.
 * KafkaTopics
 * Enthält alle in diesem Microservice verwendeten Kafka-Topics als Konstanten.
 */
export const KafkaTopics = {
  auth: {
    /** Wird verwendet, um neue Benutzer zu erstellen */
    create: "auth.create.user",

    /** Wird verwendet, um Benutzer zu löschen */
    delete: "auth.delete",
  },
  invitation: {
    /** Wird verwendet, um einer Einladung einen Benutzer zuzuweisen */
    addUser: "invitation.add.user",
  },
} as const;

/**
 * Typ zur Validierung aller erlaubten Topics
 * Type-safe Zugriff auf Topic-Namen.
 * Beispiel: `KafkaTopics.Invitation.CustomerDeleted`
 */
export type KafkaTopicsType = typeof KafkaTopics;
/**

/**
 * Hilfsfunktion zur Auflistung aller konfigurierten Topic-Namen (z. B. für Subscriptions).
 */
export function getAllKafkaTopics(): string[] {
  const flatten = (obj: any): string[] =>
    Object.values(obj).flatMap((value) =>
      typeof value === "string" ? [value] : flatten(value),
    );
  return flatten(KafkaTopics);
}

/**
 * Gibt alle Kafka-Topics zurück, optional gefiltert nach Top-Level-Kategorien.
 * @param keys z.B. ['Invitation', 'Notification']
 */
export function getKafkaTopicsBy(keys: string[]): string[] {
  const result: string[] = [];
  for (const key of keys) {
    const section = (KafkaTopics as Record<string, any>)[key];
    if (section && typeof section === "object") {
      for (const topic of Object.values(section)) {
        if (typeof topic === "string") {
          result.push(topic);
        }
      }
    }
  }
  return result;
}
