import { forwardRef, Module } from '@nestjs/common';
import { TicketReadService } from './service/ticket-read.service.js';
import { TicketWriteService } from './service/ticket-write.service.js';
import { TicketQueryResolver } from './resolver/ticket-query.resolver.js';
import { TicketMutationResolver } from './resolver/ticket-mutation.resolver.js';
import { KafkaModule } from '../messaging/kafka.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ShareGuardService } from './service/share-guard.service.js';
import { ScanService } from './service/scan.service.js';
import { ShareGuardResolver } from './resolver/share-guard.resolver.js';
import { ScanQueryResolver } from './resolver/scan-query.resolver.js';
import { ScanMutationResolver } from './resolver/scan-mutation.resolver.js';

@Module({
  imports: [forwardRef(() => KafkaModule), PrismaModule],
  providers: [
    TicketReadService,
    TicketWriteService,
    TicketQueryResolver,
    TicketMutationResolver,
    ShareGuardService,
    ScanService,
    ShareGuardResolver,
    ScanQueryResolver,
    ScanMutationResolver,
  ],
  exports: [TicketReadService, TicketWriteService],
})
export class TicketModule {}
