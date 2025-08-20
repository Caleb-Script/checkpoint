import { Args, ID, Mutation, Resolver } from "@nestjs/graphql";
import { Ticket } from "../models/entity/ticket.entity.js";
import { TicketWriteService } from "../service/ticket-write.service.js";
import { CreateTicketInput } from "../models/input/create-ticket.input.js";
import { UpdateTicketInput } from "../models/input/update-ticket.input.js";

@Resolver(() => Ticket)
export class TicketMutationResolver {
  constructor(private readonly write: TicketWriteService) {}

  @Mutation(() => Ticket, { name: "createTicket" })
  createTicket(@Args("input") input: CreateTicketInput) {
    return this.write.create(input);
  }

  @Mutation(() => Ticket, { name: "updateTicket" })
  updateTicket(@Args("input") input: UpdateTicketInput) {
    return this.write.update(input);
  }

  @Mutation(() => Ticket, { name: "deleteTicket" })
  deleteTicket(@Args("id", { type: () => ID }) id: string) {
    return this.write.delete(id);
  }

  @Mutation(() => RotatedToken)
  async rotateToken(@Args('input') input: RotateTokenInput): Promise<RotatedToken> {
    const { token, ttlSeconds } = await this.ticketService.rotate(
      input.ticketId,
      input.ttlSeconds,
      input.deviceHash,
    );
    return { token, ttlSeconds };
  }

  @Mutation(() => String)
  async sendTicket(@Args('input') input: SendTicketInput): Promise<string> {
    // Hier würdest du z. B. eine Queue anstoßen
    return `queued:${input.ticketId}`;
  }

}
