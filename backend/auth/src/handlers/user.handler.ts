// src/messaging/handlers/user.handler.ts
import { Injectable } from '@nestjs/common';
import { getLogger } from '../logger/logger.js';
import {
  KafkaEvent,
  KafkaHandler,
} from '../messaging/decorators/kafka-event.decorator.js';
import { KafkaEventHandler } from '../messaging/interface/kafka-event.interface.js';
import { KafkaTopics } from '../messaging/kafka-topic.properties.js';
import { SignInInput } from '../security/keycloak/models/inputs/sign-in.input.js';
import { KeycloakWriteService } from '../security/keycloak/services/keycloak-write.service.js';

@KafkaHandler('user')
@Injectable()
export class UserHandler implements KafkaEventHandler {
  readonly keycloakWriteService: KeycloakWriteService;
  readonly #logger = getLogger(UserHandler.name);

  constructor(KeycloakService: KeycloakWriteService) {
    this.keycloakWriteService = KeycloakService;
  }

  @KafkaEvent(KafkaTopics.auth.create, KafkaTopics.auth.delete)
  async handle(topic: string, data: any): Promise<void> {
    this.#logger.info(`Person-Kommando empfangen: ${topic}`);

    switch (topic) {
      case KafkaTopics.auth.create:
        await this.#create(data);
        break;
      case KafkaTopics.auth.delete:
        await this.#delete(data);
        break;
    }
  }

  async #create(data: { payload: SignInInput }): Promise<void> {
    this.#logger.debug('CreateUserHandler: data=%o', data);

    const { firstName, lastName, emailData, invitationId } = data.payload;
    await this.keycloakWriteService.signUp({
      firstName,
      lastName,
      emailData,
      invitationId,
    });
  }

  async #delete(username: string): Promise<void> {
    this.#logger.debug('DeleteUserHandler: username=%s', username);

    await this.keycloakWriteService.deleteUser(username);
  }
}
