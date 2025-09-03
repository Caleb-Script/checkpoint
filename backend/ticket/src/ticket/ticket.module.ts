import { Module } from '@nestjs/common';
import { KafkaModule } from '../messaging/kafka.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { TicketMutationResolver } from './resolver/ticket-mutation.resolver.js';
import { TicketQueryResolver } from './resolver/ticket-query.resolver.js';
import { TicketReadService } from './service/ticket-read.service.js';
import { TicketWriteService } from './service/ticket-write.service.js';
import { ShareGuardModule } from '../guard/guard.module.js';

@Module({
  imports: [KafkaModule, PrismaModule, RedisModule, ShareGuardModule],
  providers: [
    TicketReadService,
    TicketWriteService,
    TicketQueryResolver,
    TicketMutationResolver,
  ],
  exports: [TicketReadService, TicketWriteService],
})
export class TicketModule {}
