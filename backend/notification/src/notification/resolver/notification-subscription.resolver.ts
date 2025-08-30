/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-unused-private-class-members */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { LoggerPlus } from '../../logger/logger-plus';
import { LoggerService } from '../../logger/logger.service';
import { Notification } from '../models/entitys/notification.entity';
import { pubsub } from '../utils/pubsub';
import { Args, Resolver, Subscription } from '@nestjs/graphql';

@Resolver()
export class NotificationSubscriptionResolver {
  readonly #loggerService: LoggerService;
  readonly #logger: LoggerPlus;

  constructor(loggerService: LoggerService) {
    this.#loggerService = loggerService;
    this.#logger = this.#loggerService.getLogger(
      NotificationSubscriptionResolver.name,
    );
  }

  @Subscription(() => Notification, {
    filter: (payload, variables) =>
      payload.recipientUsername === variables.recipientUsername,
    resolve: (payload) => payload.notificationAdded,
  })
  notificationAdded(
    @Args('recipientUsername', { type: () => String })
    _recipientUsername: string,
  ) {
    return pubsub.asyncIterator('notificationAdded');
  }

  @Subscription(() => Notification, {
    filter: (payload, variables) =>
      payload.recipientUsername === variables.recipientUsername,
    resolve: (payload) => payload.notificationUpdated,
  })
  notificationUpdated(
    @Args('recipientUsername', { type: () => String })
    _recipientUsername: string,
  ) {
    return pubsub.asyncIterator('notificationUpdated');
  }
}
