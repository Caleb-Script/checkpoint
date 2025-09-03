/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// src/messaging/handlers/user.handler.ts
import { Injectable } from '@nestjs/common';
import { getLogger } from '../logger/logger.js';
import {
  KafkaHandler,
  KafkaEvent,
} from '../messaging/decorators/kafka-event.decorator.js';
import {
  KafkaEventHandler,
  KafkaEventContext,
} from '../messaging/interface/kafka-event.interface.js';
import { KafkaTopics } from '../messaging/kafka-topic.properties.js';
import { TicketWriteService } from '../ticket/service/ticket-write.service.js';

@KafkaHandler('user')
@Injectable()
export class EventHandler implements KafkaEventHandler {
  readonly #ticketWriteService: TicketWriteService;
  readonly #logger = getLogger(EventHandler.name);

  constructor(TicketWriteService: TicketWriteService) {
    this.#ticketWriteService = TicketWriteService;
  }

  @KafkaEvent(KafkaTopics.ticket.addSeat)
  async handle(
    topic: string,
    data: any,
    context: KafkaEventContext,
  ): Promise<void> {
    this.#logger.info(`Person-Kommando empfangen: ${topic}`);

    switch (topic) {
      case KafkaTopics.ticket.addSeat:
        await this.#add(data);
        break;
    }
  }

  async #add({
    id,
    guestId,
    eventId,
  }: {
    id: string | undefined;
    guestId: string;
    eventId: string;
  }) {
    this.#logger.debug('UpdateTicketHandler: data=%o', {
      id,
      guestId,
      eventId,
    });

    await this.#ticketWriteService.addSeatId({ id, eventId, guestId });
  }
}
