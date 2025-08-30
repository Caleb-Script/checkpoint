import { KafkaModule } from '../messaging/kafka.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationMutationResolver } from './resolver/notification-mutation.resolver';
import { NotificationQueryResolver } from './resolver/notification-query.resolver';
import { NotificationReadService } from './services/notification-read.service';
import { NotificationWriteService } from './services/notification-write.service';
import { NotificationRenderer } from './utils/notification.renderer';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, KafkaModule],
  providers: [
    NotificationRenderer,
    NotificationQueryResolver,
    NotificationMutationResolver,
    NotificationReadService,
    NotificationWriteService,
  ],
  exports: [NotificationReadService, NotificationWriteService],
})
export class NotificationModule {}
