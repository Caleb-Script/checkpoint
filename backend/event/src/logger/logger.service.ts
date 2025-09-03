import { Injectable } from '@nestjs/common';
import { KafkaProducerService } from '../messaging/kafka-producer.service.js';
import { LoggerPlus } from './logger-plus.js';

/**
 * LoggerService erstellt pro Kontext eine LoggerPlus-Instanz mit Kafka-Anbindung.
 */
@Injectable()
export class LoggerService {
  readonly kafka: KafkaProducerService;

  constructor(kafka: KafkaProducerService) {
    this.kafka = kafka;
  }

  getLogger(context: string): LoggerPlus {
    return new LoggerPlus(
      context,
      // this.kafka
    );
  }
}

// Verwendung in einem Service:
// constructor(private readonly loggerService: LoggerService) {}
// const logger = this.loggerService.getLogger('MyService');
// await logger.info('methode', 'Nachricht', traceId);
