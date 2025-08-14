import { PrismaModule } from '../prisma/prisma.module.js';
import { SeatMutationResolver } from './resolver/seat-mutation.resolver.js';
import { SeatQueryResolver } from './resolver/seat-query.resolver.js';
import { SeatReadService } from './service/seat-read.service.js';
import { SeatWriteService } from './service/seat-write.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule],
  providers: [
    SeatReadService,
    SeatWriteService,
    SeatQueryResolver,
    SeatMutationResolver,
  ],
})
export class SeatModule {}
