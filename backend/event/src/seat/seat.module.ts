import { KafkaModule } from '../messaging/kafka.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SeatMutationResolver } from './resolver/seat-mutation.resolver.js';
import { SeatQueryResolver } from './resolver/seat-query.resolver.js';
import { SeatReadService } from './service/seat-read.service.js';
import { SeatWriteService } from './service/seat-write.service.js';
import { forwardRef, Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, KafkaModule],
  providers: [
    SeatReadService,
    SeatWriteService,
    SeatQueryResolver,
    SeatMutationResolver,
  ],
  exports: [SeatWriteService],
})
export class SeatModule {}
