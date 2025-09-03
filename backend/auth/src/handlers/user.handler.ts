// src/messaging/handlers/user.handler.ts
import { SignInInput } from '../security/keycloak/models/inputs/sign-in.input.js';
import { KeycloakWriteService } from '../security/keycloak/services/keycloak-write.service.js';

import { Injectable, Logger } from "@nestjs/common";
import {
  KafkaEvent,
  KafkaHandler,
} from "../messaging/decorators/kafka-event.decorator.js";
import {
  KafkaEventContext,
  KafkaEventHandler,
} from "../messaging/interface/kafka-event.interface.js";
import { KafkaTopics } from "../messaging/kafka-topic.properties.js";

@KafkaHandler('user')
@Injectable()
export class UserHandler implements KafkaEventHandler {
  private readonly logger = new Logger(UserHandler.name);

  constructor(
    private readonly keycloakService: KeycloakWriteService,
  ) { }

  @KafkaEvent(KafkaTopics.auth.create, KafkaTopics.auth.delete)
  async handle(topic: string, data: any, context: KafkaEventContext): Promise<void> {
    console.debug(`Person-Kommando empfangen: ${topic}`);
    console.debug('Kontext: %o',context)

    switch (topic) {
      case KafkaTopics.auth.create:
        await this.create(data);
        break;
    }
  }

  private async create(data: { payload: SignInInput }) {
    this.logger.debug('CreateUserHandler: data=%o', data);

    const input = data.payload;
    await this.keycloakService.signUp(input);
  }
}
