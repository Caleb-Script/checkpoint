import { Module } from "@nestjs/common";
import { TicketHandler } from "./ticket.handler.js";
import { SeatModule } from "../seat/seat.module.js";

@Module({
  imports: [SeatModule],
  providers: [TicketHandler],
  exports: [TicketHandler],
})
export class HandlerModule {}
