/* eslint-disable @typescript-eslint/no-unsafe-argument */
// src/messaging/handlers/user.handler.ts
import { Injectable } from "@nestjs/common";
import {
  KafkaEvent,
  KafkaHandler,
} from "../messaging/decorators/kafka-event.decorator.js";
import {
  KafkaEventContext,
  KafkaEventHandler,
} from "../messaging/interface/kafka-event.interface.js";
import { KafkaTopics } from "../messaging/kafka-topic.properties.js";
import { SeatWriteService } from "../seat/service/seat-write.service.js";

@KafkaHandler("ticket")
@Injectable()
export class TicketHandler implements KafkaEventHandler {
  // readonly #logger = getLogger(UserHandler.name);

  constructor(private readonly seatWriteService: SeatWriteService) {
    console.debug(
      "🔧 Injection Check – invitationWriteService:",
      !!seatWriteService,
    );
  }

  @KafkaEvent(KafkaTopics.event.updateSeat)
  async handle(
    topic: string,
    data: any,
    _context: KafkaEventContext,
  ): Promise<void> {
    // this.#logger.info(`Person-Kommando empfangen: ${topic}`);

    switch (topic) {
      case KafkaTopics.event.updateSeat:
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
    console.debug('UpdateSeatHandler: data=%o', {
      id,
      guestId,
      eventId,
    });

    await this.seatWriteService.reserveSeat({ id, eventId, guestId });
  }
}
