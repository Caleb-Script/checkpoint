// src/messaging/handlers/user.handler.ts
import { Injectable } from "@nestjs/common";
import { InvitationWriteService } from "../invitation/service/invitation-write.service.js";
import { getLogger } from "../logger/logger.js";
import {
  KafkaEvent,
  KafkaHandler,
} from "../messaging/decorators/kafka-event.decorator.js";
import {
  KafkaEventContext,
  KafkaEventHandler,
} from "../messaging/interface/kafka-event.interface.js";
import { KafkaTopics } from "../messaging/kafka-topic.properties.js";

@KafkaHandler("user")
@Injectable()
export class UserHandler implements KafkaEventHandler {
  // readonly #logger = getLogger(UserHandler.name);

  constructor(private readonly invitationWriteService: InvitationWriteService) {
    console.debug(
      "🔧 Injection Check – invitationWriteService:",
      !!invitationWriteService,
    );
  }

  @KafkaEvent(KafkaTopics.invitation.addUser)
  async handle(
    topic: string,
    data: any,
    context: KafkaEventContext,
  ): Promise<void> {
    // this.#logger.info(`Person-Kommando empfangen: ${topic}`);

    switch (topic) {
      case KafkaTopics.invitation.addUser:
        await this.create(data);
        break;
    }
  }

  private async create({
    userId,
    invitationId,
  }: {
    userId: string;
    invitationId: string;
  }) {
    console.debug("🔎 Empfangenes Payload:", { userId, invitationId }); // 👈 hinzufügen!
    await this.invitationWriteService.addUserId({ userId, invitationId });
  }
}
