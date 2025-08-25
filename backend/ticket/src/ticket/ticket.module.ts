import { forwardRef, Module } from '@nestjs/common';
import { TicketReadService } from './service/ticket-read.service.js';
import { TicketWriteService } from './service/ticket-write.service.js';
import { TicketQueryResolver } from './resolver/ticket-query.resolver.js';
import { TicketMutationResolver } from './resolver/ticket-mutation.resolver.js';
import { PrismaService } from './service/prisma.service.js';
import { KafkaModule } from '../messaging/kafka.module.js';

@Module({
  imports: [forwardRef(() => KafkaModule)],
  providers: [
    TicketReadService,
    TicketWriteService,
    TicketQueryResolver,
    TicketMutationResolver,
    PrismaService,
  ],
  exports: [TicketReadService, TicketWriteService],
})
export class TicketModule {}
