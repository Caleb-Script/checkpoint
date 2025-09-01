// /src/messaging/handlers/user-attributes.handler.ts
import { Injectable } from '@nestjs/common';
import { getLogger } from '../logger/logger';
import {
  KafkaHandler,
  KafkaEvent,
} from '../messaging/decorators/kafka-event.decorator';
import { KafkaTopics } from '../messaging/kafka-topic.properties';
import { KeycloakWriteService } from '../security/keycloak/services/keycloak-write.service';

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

  @KafkaEvent(KafkaTopics.user.addAttribute, KafkaTopics.user.setAttribute)
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
        data.mode ?? (topic === KafkaTopics.user.setAttribute ? 'set' : 'set'),
    });

    this.#logger.info(
      'AddAttribute applied for topic=%s userId=%s',
      topic,
      data.userId ?? '',
    );
  }
}
