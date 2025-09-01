// src/messaging/handlers/user.handler.ts
import { Injectable } from '@nestjs/common';
import { getLogger } from '../logger/logger';
import {
  KafkaEvent,
  KafkaHandler,
} from '../messaging/decorators/kafka-event.decorator';
import { KafkaEventHandler } from '../messaging/interface/kafka-event.interface';
import { KafkaTopics } from '../messaging/kafka-topic.properties';
import { SignInInput } from '../security/keycloak/models/inputs/sign-in.input';
import { KeycloakWriteService } from '../security/keycloak/services/keycloak-write.service';

@KafkaHandler('user')
@Injectable()
export class UserHandler implements KafkaEventHandler {
  readonly keycloakWriteService: KeycloakWriteService;
  readonly #logger = getLogger(UserHandler.name);

  constructor(KeycloakService: KeycloakWriteService) {
    this.keycloakWriteService = KeycloakService;
  }

  @KafkaEvent(KafkaTopics.user.create, KafkaTopics.user.delete)
  async handle(topic: string, data: any): Promise<void> {
    this.#logger.info(`Person-Kommando empfangen: ${topic}`);

    switch (topic) {
      case KafkaTopics.user.create:
        await this.#create(data);
        break;
      case KafkaTopics.user.delete:
        await this.#delete(data);
        break;
    }
  }

  async #create(data: SignInInput): Promise<void> {
    this.#logger.debug('CreateUserHandler: data=%o', data);

    const { firstName, lastName, emailData, invitationId } = data;
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
