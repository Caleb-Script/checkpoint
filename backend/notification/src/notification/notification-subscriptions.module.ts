// src/notification/notification-subscriptions.module.ts
import { NotificationSubscriptionResolver } from './resolver/notification-subscription.resolver';
import { Module } from '@nestjs/common';

@Module({
  providers: [NotificationSubscriptionResolver],
  exports: [NotificationSubscriptionResolver],
})
export class NotificationSubscriptionsModule {}
