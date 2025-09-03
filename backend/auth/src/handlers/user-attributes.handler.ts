// /src/messaging/handlers/user-attributes.handler.ts
import { Injectable } from '@nestjs/common';
import { getLogger } from '../logger/logger.js';
import {
  KafkaHandler,
  KafkaEvent,
} from '../messaging/decorators/kafka-event.decorator.js';
import { KafkaTopics } from '../messaging/kafka-topic.properties.js';
import { KeycloakWriteService } from '../security/keycloak/services/keycloak-write.service.js';

type Mode = 'set' | 'append' | 'remove';

export interface AddUserAttributeEvent {
  userId?: string;
  username?: string;
  email?: string;
  attributes: Record<string, unknown>;
  mode?: Mode;
}

@KafkaHandler('user-attributes')
@Injectable()
export class UserAttributesHandler {
  #logger = getLogger(UserAttributesHandler.name);
  constructor(private readonly keycloakWriteService: KeycloakWriteService) {}

  @KafkaEvent(KafkaTopics.auth.addAttribute, KafkaTopics.auth.setAttribute)
  async handle(topic: string, data: AddUserAttributeEvent): Promise<void> {
    this.#logger.debug(
      'AddAttribute event received: topic=%s data=%o',
      topic,
      data,
    );

    await this.keycloakWriteService.addAttribute({
      userId: data.userId ?? '',
      attributes: data.attributes,
      mode:
        data.mode ?? (topic === KafkaTopics.auth.setAttribute ? 'set' : 'set'),
    });

    this.#logger.info(
      'AddAttribute applied for topic=%s userId=%s',
      topic,
      data.userId ?? '',
    );
  }
}
