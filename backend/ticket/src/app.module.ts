import { Module } from '@nestjs/common';
import { TicketModule } from './ticket/ticket.module.js';
import { PrismaService } from '../shared/prisma.service.js';
import { AuthGuard } from '../shared/auth.guard.js';

@Module({
  imports: [TicketModule],
  providers: [PrismaService, AuthGuard],
})
export class AppModule {}
