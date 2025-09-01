/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// src/messaging/handlers/user.handler.ts
import { getLogger } from '../logger/logger.js';
import {
  KafkaEvent,
  KafkaHandler,
} from '../messaging/decorators/kafka-event.decorator.js';
import {
  KafkaEventContext,
  KafkaEventHandler,
} from '../messaging/interface/kafka-event.interface.js';
import { KafkaTopics } from '../messaging/kafka-topic.properties.js';
import { SeatWriteService } from '../seat/service/seat-write.service.js';
import { Injectable } from '@nestjs/common';

@KafkaHandler('user')
@Injectable()
export class TicketHandler implements KafkaEventHandler {
  readonly #seatWriteService: SeatWriteService;
  readonly #logger = getLogger(TicketHandler.name);

  constructor(SeatWriteService: SeatWriteService) {
    this.#seatWriteService = SeatWriteService;
  }

  @KafkaEvent(KafkaTopics.ticket.updateSeat)
  async handle(
    topic: string,
    data: any,
    context: KafkaEventContext,
  ): Promise<void> {
    this.#logger.info(`Person-Kommando empfangen: ${topic}`);

    switch (topic) {
      case KafkaTopics.ticket.updateSeat:
        await this.#update(data);
        break;
    }
  }

  async #update({
    id,
    guestId,
    eventId,
  }: {
    id: string | undefined;
    guestId: string;
    eventId: string;
  }) {
    this.#logger.debug('UpdateSeatHandler: data=%o', {
      id,
      guestId,
      eventId,
    });

    await this.#seatWriteService.reserveSeat({ id, eventId, guestId });
  }
}
