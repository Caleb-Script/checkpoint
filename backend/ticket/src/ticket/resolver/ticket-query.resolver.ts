import { Args, ID, Query, Resolver } from "@nestjs/graphql";
import { Ticket } from "../models/entity/ticket.entity.js";
import { TicketReadService } from "../service/ticket-read.service.js";

@Resolver(() => Ticket)
export class TicketQueryResolver {
  constructor(private readonly read: TicketReadService) {}

  @Query(() => Ticket, { name: "getTicketById", nullable: true })
  getTicketById(@Args("id", { type: () => ID }) id: string) {
    return this.read.findById(id);
  }

  @Query(() => [Ticket], { name: "getTickets" })
  getTickets() {
    return this.read.find();
  }
}
