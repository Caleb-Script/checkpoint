/* eslint-disable @typescript-eslint/no-unsafe-argument */
// src/messaging/handlers/user.handler.ts
import { getLogger } from '../../logger/logger.js';
import {
  KafkaEvent,
  KafkaHandler,
} from '../../messaging/decorators/kafka-event.decorator.js';
import {
  KafkaEventContext,
  KafkaEventHandler,
  tenantFromKafka,
} from '../../messaging/interface/kafka-event.interface.js';
import { KafkaTopics } from '../../messaging/kafka-topic.properties.js';
import { Category } from '../../notification/models/enums/category.enum.js';
import { Priority } from '../../notification/models/enums/priority.enum.js';
import { NotificationInput } from '../../notification/models/inputs/notify.input.js';
import { NotificationWriteService } from '../../notification/services/notification-write.service.js';

import { Injectable } from '@nestjs/common';
import { UserCredentialDTO } from '../models/dto/user-created-schema.dto.js';

@KafkaHandler('user')
@Injectable()
export class UserHandler implements KafkaEventHandler {
  readonly #notificationWriteService: NotificationWriteService;
  readonly #logger = getLogger(UserHandler.name);

  constructor(notificationWriteService: NotificationWriteService) {
    this.#notificationWriteService = notificationWriteService;
  }

  @KafkaEvent(KafkaTopics.auth.created)
  async handle(
    topic: string,
    data: any,
    context: KafkaEventContext,
  ): Promise<void> {
    this.#logger.info(
      'User-Event empfangen: %s offset=%s partition=%d',
      topic,
      context.offset,
      context.partition,
    );

    switch (topic) {
      case KafkaTopics.auth.created:
        await this.#sendUserCredentials(data, context);
        break;
      default:
        this.#logger.warn('Unbehandeltes Topic: %s', topic);
    }
  }

  async #sendUserCredentials(
    // raw: unknown,
    data: UserCredentialDTO,
    ctx: KafkaEventContext,
  ): Promise<void> {
    // 1) Validate incoming payload
    // const parsed = UserCreatedSchema.safeParse(raw);
    // if (!parsed.success) {
    //   this.#logger.error('Ungültiges user.created Payload: %o', parsed.error.flatten());
    //   return; // oder in DLQ routen
    // }

    // const { username, password, userId, firstName, phone } = parsed.data as UserCreatedEvent;

    this.#logger.debug('CreateUserHandler: data=%o', data);
    const { username, password, userId, firstName, phone } = data;

    // 2) Tenant aus Header ziehen (oder default)
    const derivedTenant = tenantFromKafka(ctx) ?? 'default';

    // 4) TTL (z. B. 24h) aus ENV oder Default
    const ttlSeconds = Number(process.env.CREDENTIALS_TTL_SECONDS ?? 86400);

    // 5) Idempotenz-Key (gegen Retry-Dubletten)
    //    – falls dein Notification-Service das unterstützt (empfohlen)
    const dedupeKey =
      ctx.headers?.['x-event-id'] ??
      `${ctx.topic}:${ctx.partition}:${ctx.offset}`;

    const input: NotificationInput = {
      templateId: 'cmezn1js600008o8xa4cz3usm',
      recipientUsername: username,
      recipientId: userId,
      recipientTenant: derivedTenant,
      variables: {
        firstName,
        username,
        password,
        ...(phone ? { phone } : {}),
      },
      priority: Priority.URGENT,
      category: Category.WHATSAPP,
      linkUrl: undefined,
      sensitive: true,
      ttlSeconds,
    };

    this.#logger.debug('Credentials-Notification: %o', {
      tenant: derivedTenant,
      hasPhone: Boolean(phone),
    });

    // 6) Notification anlegen (und optional dedupen)
    // Falls dein Service eine dedupe-Option hat:
    // await this.#notificationWriteService.create(input, { dedupeKey });
    await this.#notificationWriteService.create(input, {
      dedupeKey,
      publish: true,
    });
  }
}
