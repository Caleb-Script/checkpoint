// src/messaging/handlers/user.handler.ts
import { Injectable } from '@nestjs/common';
import { getLogger } from '../../logger/logger.js';
import {
  KafkaEvent,
  KafkaHandler,
} from '../decorators/kafka-event.decorator.js';
import { KafkaEventHandler } from '../interface/kafka-event.interface.js';
import { KafkaTopics } from '../kafka-topic.properties.js';
import {
  KeycloakService,
  SignIn,
} from '../../security/keycloak/keycloak.service.js';

@KafkaHandler('user')
@Injectable()
export class UserHandler implements KafkaEventHandler {
  readonly keycloakService: KeycloakService;
  readonly #logger = getLogger(UserHandler.name);

  constructor(KeycloakService: KeycloakService) {
    this.keycloakService = KeycloakService;
  }

  @KafkaEvent(KafkaTopics.user.create)
  async handle(topic: string, data: any): Promise<void> {
    this.#logger.info(`Person-Kommando empfangen: ${topic}`);

    switch (topic) {
      case KafkaTopics.user.create:
        await this.#create(data);
        break;
    }
  }

  async #create(data: SignIn): Promise<void> {
    this.#logger.debug('CreateUserHandler: data=%o', data);

    const { firstName, lastName, emailData, invitationId } = data;
    await this.keycloakService.signUp({
      firstName,
      lastName,
      emailData,
      invitationId,
    });
  }
}
