/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { LoggerPlus } from '../../logger/logger-plus';
import { LoggerService } from '../../logger/logger.service';
import {
  Notification,
  NotificationConnection,
} from '../models/entitys/notification.entity';
import {
  ListAllNotificationsInput,
  ListNotificationsInput,
} from '../models/inputs/inputs';
import { NotificationReadService } from '../services/notification-read.service';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class NotificationQueryResolver {
  readonly #notificationReadservice: NotificationReadService;
  readonly #loggerService: LoggerService;
  readonly #logger: LoggerPlus;

  constructor(
    notificationReadservice: NotificationReadService,
    loggerService: LoggerService,
  ) {
    this.#notificationReadservice = notificationReadservice;
    this.#loggerService = loggerService;
    this.#logger = this.#loggerService.getLogger(
      NotificationQueryResolver.name,
    );
  }

  @Query(() => Notification, { nullable: true })
  async notification(@Args('id', { type: () => ID }) id: string) {
    void this.#logger.debug('notificationById: id=%s', id);

    const notification = await this.#notificationReadservice.findById(id);
    return notification;
  }

  @Query(() => [Notification], { nullable: true })
  async notifications() {
    const notification = await this.#notificationReadservice.findAll();
    return notification;
  }

  @Query(() => [Notification], { nullable: true })
  async notificationByUser(@Args('id', { type: () => ID }) id: string) {
    const notifications = await this.#notificationReadservice.findByUser(id);
    void this.#logger.debug(
      'notificationByUser: notifications=%o',
      notifications,
    );
    return notifications;
  }

  @Query(() => NotificationConnection)
  async notificationsPaged(
    @Args('input') input: ListAllNotificationsInput,
  ): Promise<NotificationConnection> {
    const result = await this.#notificationReadservice.find(input);
    return result;
  }

  @Query(() => Notification, { nullable: true })
  async notificationByUser2(@Args('id', { type: () => ID }) id: string) {
    // Optional: Zugriff nur für Besitzer
    const { items } = await this.#notificationReadservice.find2({
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
    return this.#notificationReadservice.find2(input);
  }
}
