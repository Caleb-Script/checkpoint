import { Module } from "@nestjs/common";
import { TicketReadService } from "./service/ticket-read.service.js";
import { TicketWriteService } from "./service/ticket-write.service.js";
import { TicketQueryResolver } from "./resolver/ticket-query.resolver.js";
import { TicketMutationResolver } from "./resolver/ticket-mutation.resolver.js";
import { PrismaModule } from "@app/prisma/prisma.module.js";

@Module({
  imports: [PrismaModule],
  providers: [
    TicketReadService,
    TicketWriteService,
    TicketQueryResolver,
    TicketMutationResolver
  ]
})
export class TicketModule {}
