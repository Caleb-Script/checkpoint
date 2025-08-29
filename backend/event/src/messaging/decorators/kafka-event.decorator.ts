// src/messaging/decorators/kafka-event.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const KAFKA_HANDLER = 'KAFKA_HANDLER';
export const KAFKA_EVENT_TOPICS = 'KAFKA_EVENT_TOPICS';
export const KAFKA_EVENT_METADATA = 'KAFKA_EVENT_METADATA';

/**
 * Klassen-Decorator – markiert eine Klasse als Kafka-Handler für eine Topic-Gruppe
 */
export function KafkaHandler(handlerName: string): ClassDecorator {
  return (target) => {
    SetMetadata(KAFKA_HANDLER, handlerName)(target);
  };
}

/**
 * Methoden-Decorator – weist einer Methode eine Liste von Kafka-Topics zu
 */
export function KafkaEvent(...topics: string[]): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    SetMetadata(KAFKA_EVENT_TOPICS, topics)(target, propertyKey, descriptor);
  };
}
