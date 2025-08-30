/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Notification } from '../models/entitys/notification.entity';
import { MarkReadInput } from '../models/inputs/inputs';
import { NotifyFromTemplateInput } from '../models/inputs/notify.input';
import { NotificationWriteService } from '../services/notification-write.service';
import { pubsub } from '../utils/pubsub';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';

@Resolver()
export class NotificationMutationResolver {
  readonly #notificationWriteservice: NotificationWriteService;

  constructor(notificationWriteservice: NotificationWriteService) {
    this.#notificationWriteservice = notificationWriteservice;
  }

  @Mutation(() => Notification)
  async notifyFromTemplate(@Args('input') input: NotifyFromTemplateInput) {
    const n = await this.#notificationWriteservice.create(input);
    await pubsub.publish('notificationAdded', {
      notificationAdded: n,
      recipientUsername: n.recipientUsername,
    });
    return n;
  }

  @Mutation(() => Notification)
  async markNotificationRead(@Args('input') input: MarkReadInput) {
    const n = await this.#notificationWriteservice.markRead(input.id);
    await pubsub.publish('notificationUpdated', {
      notificationUpdated: n,
      recipientUsername: n.recipientUsername,
    });
    return n;
  }

  @Mutation(() => Notification)
  async archiveNotification(@Args('id', { type: () => ID }) id: string) {
    const n = await this.#notificationWriteservice.archive(id);
    await pubsub.publish('notificationUpdated', {
      notificationUpdated: n,
      recipientUsername: n.recipientUsername,
    });
    return n;
  }
}
