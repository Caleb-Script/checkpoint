/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { NotificationConnection } from '../models/entitys/notification.entity';
import { Notification } from '../models/entitys/notification.entity';
import { ListNotificationsInput } from '../models/inputs/inputs';
import { NotificationReadService } from '../services/notification-read.service';
import { pubsub } from '../utils/pubsub';
import { Args, ID, Query, Resolver, Subscription } from '@nestjs/graphql';

@Resolver()
export class NotificationQueryResolver {
  readonly #notificationReadservice: NotificationReadService;

  constructor(notificationReadservice: NotificationReadService) {
    this.#notificationReadservice = notificationReadservice;
  }

  // ---- Notifications ----
  @Query(() => Notification, { nullable: true })
  async notification(@Args('id', { type: () => ID }) id: string) {
    // Optional: Zugriff nur für Besitzer
    const { items } = await this.#notificationReadservice.listForUser({
      recipientUsername: '',
      includeRead: true,
      limit: 1,
      cursor: undefined,
    }); // placeholder
    return (
      (await (this as any).service['prisma'].notification.findUnique({
        where: { id },
      })) ?? null
    );
  }

  @Query(() => NotificationConnection)
  async myNotifications(@Args('input') input: ListNotificationsInput) {
    return this.#notificationReadservice.listForUser(input);
  }

  // ---- Subscriptions (In-App Push) ----
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
