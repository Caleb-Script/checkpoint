import { KafkaModule } from '../messaging/kafka.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TemplateModule } from '../template/template.module';
import { UserHandler } from './handlers/user.handler';
import { NotificationMutationResolver } from './resolver/notification-mutation.resolver';
import { NotificationQueryResolver } from './resolver/notification-query.resolver';
import { NotificationReadService } from './services/notification-read.service';
import { NotificationWriteService } from './services/notification-write.service';
import { NotificationRenderer } from './utils/notification.renderer';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, TemplateModule, KafkaModule],
  providers: [
    NotificationRenderer,
    NotificationQueryResolver,
    NotificationMutationResolver,
    NotificationReadService,
    NotificationWriteService,
    UserHandler,
  ],
  exports: [NotificationReadService, NotificationWriteService],
})
export class NotificationModule {}
