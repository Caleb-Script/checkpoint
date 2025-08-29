import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { Ticket } from '../models/entity/ticket.entity.js';
import { CreateTicketInput } from '../models/input/create-ticket.input.js';
import { TicketWriteService } from '../service/ticket-write.service.js';

@Resolver(() => Ticket)
export class TicketMutationResolver {
  readonly #ticketWriteService: TicketWriteService;

  constructor(writeService: TicketWriteService) {
    this.#ticketWriteService = writeService;
  }

  @Mutation(() => Ticket, { name: 'createTicket' })
  createTicket(@Args('input') input: CreateTicketInput) {
    return this.#ticketWriteService.create(input);
  }

  @Mutation(() => Ticket, { name: 'deleteTicket' })
  deleteTicket(@Args('id', { type: () => ID }) id: string) {
    return this.#ticketWriteService.delete(id);
  }
}
