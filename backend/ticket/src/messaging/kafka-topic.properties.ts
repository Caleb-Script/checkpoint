/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Zentrale Konfiguration aller Kafka-Topics im System.
 * Dient der Typsicherheit, Übersichtlichkeit und Wiederverwendbarkeit in Publishern und Handlern.
 */

export const KafkaTopics = {
  auth: {
    addUser: 'invitation.add.user',
    approve: 'auth.create.user',
    addAttribute: 'auth.add-attribute.user',
    setAttribute: 'auth.set-attribute.user',
  },
  event: {
    updateSeat: 'event.update.seat',
    addSeat: 'ticket.add.seat',
  },
} as const;

/**
 * Type-safe Zugriff auf Topic-Namen.
 * Beispiel: `KafkaTopics.Invitation.CustomerDeleted`
 */
export type KafkaTopicsType = typeof KafkaTopics;

/**
 * Hilfsfunktion zur Auflistung aller konfigurierten Topic-Namen (z.B. für Subscriptions).
 */
export function getAllKafkaTopics(): string[] {
  const flatten = (obj: any): string[] =>
    Object.values(obj).flatMap((value) =>
      typeof value === 'string' ? [value] : flatten(value),
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
    if (section && typeof section === 'object') {
      for (const topic of Object.values(section)) {
        if (typeof topic === 'string') {
          result.push(topic);
        }
      }
    }
  }
  return result;
}
