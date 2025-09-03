import { Module } from '@nestjs/common';
import { TicketModule } from '../ticket/ticket.module.js';
import { EventHandler } from './event.handler.js';

@Module({
  imports: [TicketModule],
  providers: [EventHandler],
  exports: [EventHandler],
})
export class HandlerModule {}
